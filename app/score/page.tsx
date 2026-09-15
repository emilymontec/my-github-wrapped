import { SCORE_CAPS, SCORE_WEIGHTS, SCORE_VERSION } from "@/lib/analytics/score";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";

/**
 * Página pública (sin auth) documentando la fórmula del Developer
 * Activity Score — sección 42, Consideraciones de la Fase 5: "Documentar
 * la fórmula del score en una página pública... un score misterioso
 * genera desconfianza en un producto que la gente usa recurrentemente."
 *
 * Los números de esta página vienen directamente de las constantes de
 * lib/analytics/score.ts — no son una aproximación redactada aparte que
 * pueda desincronizarse del código real.
 */
export default function ScoreExplainerPage() {
  return (
    <main className="relative mx-auto max-w-2xl px-6 py-16 text-white">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10">
      <h1 className="font-display text-3xl font-semibold text-white">
        Cómo se calcula el Developer Activity Score
      </h1>
      <p className="mt-2 text-sm text-cool-muted/70">Versión de la fórmula: v{SCORE_VERSION}</p>

      <p className="mt-6 leading-relaxed text-cool-muted">
        Es un índice de <strong>actividad</strong>, no de productividad ni de calidad de
        código. Más commits no significa mejor código, y menos commits no significa menos
        trabajo real — por eso nunca lo llamamos &ldquo;Productivity Score&rdquo;. Combina cuatro
        dimensiones, cada una limitada a un rango de 0 a 100, y las suma con pesos fijos.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <ScoreDimension
          name="Consistencia"
          weight={SCORE_WEIGHTS.consistency}
          description={`Porcentaje de días del período con al menos un commit. 100% de días activos = 100 puntos en esta dimensión.`}
        />
        <ScoreDimension
          name="Volumen"
          weight={SCORE_WEIGHTS.volume}
          description={`Total de commits en el período, con un techo de ${SCORE_CAPS.volumeCommits} commits para llegar a 100 puntos. Por encima de eso, no suma más — el objetivo es premiar actividad sostenida, no una carrera sin límite.`}
        />
        <ScoreDimension
          name="Rachas"
          weight={SCORE_WEIGHTS.streak}
          description={`Tu racha más larga del período, con un techo de ${SCORE_CAPS.streakDays} días para llegar a 100 puntos.`}
        />
        <ScoreDimension
          name="Diversidad"
          weight={SCORE_WEIGHTS.diversity}
          description="Qué tan repartido está tu código entre lenguajes distintos (entropía de Shannon normalizada, la misma métrica que ya usa el Insights Engine para detectar 'polyglot'). Un solo lenguaje dominante = 0. Uso perfectamente repartido entre varios = 100."
        />
      </div>

      <p className="mt-8 text-sm leading-relaxed text-cool-muted/70">
        El score final es el promedio ponderado de las cuatro dimensiones, redondeado al
        entero más cercano. Los pesos suman exactamente 1, así que el resultado siempre cae
        entre 0 y 100.
      </p>
    </div>
    </main>
  );
}

function ScoreDimension({
  name,
  weight,
  description
}: {
  name: string;
  weight: number;
  description: string;
}) {
  return (
    <div className="bento-panel p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold text-white">{name}</h2>
        <span className="text-sm text-cool-cyan">{Math.round(weight * 100)}% del score</span>
      </div>
      <p className="text-sm leading-relaxed text-cool-muted">{description}</p>
    </div>
  );
}
