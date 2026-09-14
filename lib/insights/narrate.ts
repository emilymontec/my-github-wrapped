import { prisma } from "@/lib/db/prisma";
import { renderTemplate } from "@/lib/insights/templates";
import type { DetectedInsight } from "@/lib/insights/types";

/**
 * ⚠️ Última etapa del pipeline (sección 16): "datos → Analytics Engine →
 * métricas estructuradas → Insights Engine → lenguaje natural". La IA
 * solo redacta la frase a partir de `insight.data`, que ya viene
 * calculado y verificado — nunca se le pide que calcule un porcentaje o
 * infiera un número que no esté en `data`.
 *
 * Modelo elegido: un modelo instruction-tuned servido por la Hugging
 * Face Inference API (por defecto Mistral-7B-Instruct; configurable vía
 * HUGGINGFACE_MODEL sin tocar código, porque la disponibilidad de
 * modelos en el free tier de HF cambia con más frecuencia que la de
 * Anthropic). Es una tarea de redacción de una frase corta, no de
 * razonamiento complejo -- no hace falta un modelo más grande.
 */
const DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";
const MIN_LENGTH = 20;
const MAX_LENGTH = 240;

export interface NarrateOptions {
  userId: string;
  /** Si es false, nunca llama a la API — usa la plantilla directamente. */
  useAI: boolean;
}

export interface NarrateResult {
  text: string;
  source: "AI" | "TEMPLATE";
}

function buildPrompt(insight: DetectedInsight): string {
  return [
    '[INST] Eres el redactor de "GitHub Wrapped", un reporte anual de actividad de programación al estilo Spotify Wrapped.',
    "Se te da un insight ya calculado. Los números son ciertos — no los inventes, no los cambies, no agregues otros que no estén en los datos.",
    "Redacta UNA sola frase en español, tono cercano y celebratorio, sin emojis, sin comillas, sin markdown, sin consejos, sin preguntas.",
    `Tipo de insight: ${insight.type}`,
    `Datos: ${JSON.stringify(insight.data)}`,
    "Responde ÚNICAMENTE con la frase final, nada más. [/INST]"
  ].join("\n");
}

/**
 * Moderación básica de salida (sección 16): si la IA devuelve algo fuera
 * de un rango de longitud esperado o con contenido que no debería
 * aparecer en una frase de una línea (markdown, links, HTML), se descarta
 * y se usa el fallback — no se muestra al usuario sin pasar este filtro.
 */
function isNarrativeValid(text: string): boolean {
  if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) return false;
  if (/```|https?:\/\/|<[a-z/][^>]*>/i.test(text)) return false;
  if (text.split("\n").length > 1) return false;
  return true;
}

interface HuggingFaceCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * ⚠️ Diferencia real con la implementación anterior (Anthropic): la
 * Hugging Face Inference API para modelos de `text-generation` no
 * devuelve conteo de tokens de uso como `usage.input_tokens` de
 * Anthropic, así que `inputTokens`/`outputTokens` en `AiUsageLog`
 * quedan siempre en 0 acá -- es una limitación documentada del proveedor,
 * no un bug. Si en el futuro se necesita medir costo real, habría que
 * estimarlo aproximando tokens ≈ caracteres / 4, pero eso es una
 * aproximación y se documenta como tal si se agrega.
 *
 * `return_full_text: false` es necesario porque los modelos de
 * `text-generation` de HF devuelven por defecto el prompt completo más
 * la continuación -- sin este parámetro habría que recortar el prompt
 * manualmente del resultado.
 */
async function callHuggingFace(prompt: string): Promise<HuggingFaceCallResult | null> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.HUGGINGFACE_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 80,
          temperature: 0.6,
          return_full_text: false
        },
        // Evita un 503 inmediato si el modelo estaba "dormido" (cold start
        // del free tier); espera a que cargue en vez de fallar de una.
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) return null;

    const data = (await response.json()) as
      | { generated_text?: string }[]
      | { error?: string };

    const text = Array.isArray(data) ? data[0]?.generated_text?.trim() : undefined;
    if (!text) return null;

    return { text, inputTokens: 0, outputTokens: 0 };
  } catch {
    return null;
  }
}

/**
 * Auditoría de costo (sección 16: "controlar costo en llamadas a IA").
 * Nunca debe tirar abajo la generación de insights si el logging falla.
 */
async function logAiUsage(entry: {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  succeeded: boolean;
  fallbackUsed: boolean;
}): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        purpose: "insight_narration",
        model: process.env.HUGGINGFACE_MODEL || DEFAULT_MODEL,
        ...entry
      }
    });
  } catch {
    // intencional: el logging de costo es best-effort
  }
}

export async function narrateInsight(
  insight: DetectedInsight,
  options: NarrateOptions
): Promise<NarrateResult> {
  const fallbackText = renderTemplate(insight);

  if (!options.useAI) {
    return { text: fallbackText, source: "TEMPLATE" };
  }

  const aiResult = await callHuggingFace(buildPrompt(insight));
  const isValid = aiResult !== null && isNarrativeValid(aiResult.text);

  await logAiUsage({
    userId: options.userId,
    inputTokens: aiResult?.inputTokens ?? 0,
    outputTokens: aiResult?.outputTokens ?? 0,
    succeeded: isValid,
    fallbackUsed: !isValid
  });

  if (!isValid) {
    return { text: fallbackText, source: "TEMPLATE" };
  }

  return { text: aiResult.text, source: "AI" };
}
