import { prisma } from "@/lib/db/prisma";
import { evaluateRateLimit, type RateLimitConfig, type RateLimitDecision } from "@/lib/ratelimit/evaluate";

/**
 * ⚠️ Ventana fija (fixed window), no sliding/token-bucket -- a propósito:
 * es el diseño más simple que sigue siendo correcto bajo concurrencia
 * con UNA sola sentencia SQL, y para este caso de uso (frenar abuso, no
 * dar un SLA de tráfico preciso) la imprecisión de "hasta 2x el límite
 * cerca del borde de la ventana" es aceptable. Un sliding window o
 * token-bucket exacto necesitaría más de una fila por key o un job de
 * limpieza aparte -- complejidad que esta fase no justifica.
 *
 * ⚠️ SIEMPRE incrementa el contador, incluso cuando ya se excedió el
 * límite (nunca hace `SELECT` primero para decidir si escribir) -- así
 * la fila queda como única fuente de verdad de "cuántas veces se llamó
 * esto en la ventana", útil para debugging/auditoría, y evita la misma
 * ventana de carrera check-then-write que documenta
 * `lib/notifications/service.ts::tryClaimNotification`.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitDecision> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - config.windowMs);

  // ⚠️ `$queryRawUnsafe` en vez de `$queryRaw` + `Prisma.sql`: el tagged
  // template `Prisma.sql` vive en el cliente de Prisma GENERADO (no en
  // el paquete base), y `prisma generate` está bloqueado en este sandbox
  // por red (mismo límite documentado en fases anteriores). `$queryRawUnsafe`
  // sigue siendo seguro contra inyección SQL -- los `$1`/`$2`/`$3` son
  // placeholders posicionales que el driver de Postgres parametriza de
  // verdad, "unsafe" se refiere a que el texto de la query no se valida
  // contra el schema en compilación, no a que los parámetros viajen sin
  // escapar.
  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO "RateLimitBucket" (key, "windowStart", count)
     VALUES ($1, $2, 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN "RateLimitBucket"."windowStart" <= $3 THEN 1 ELSE "RateLimitBucket".count + 1 END,
       "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" <= $3 THEN $2 ELSE "RateLimitBucket"."windowStart" END
     RETURNING count, "windowStart"`,
    key,
    now,
    cutoff
  )) as { count: number; windowStart: Date }[];

  const row = rows[0];
  return evaluateRateLimit(row.count, row.windowStart, now, config);
}

/**
 * Presets por acción -- todos por usuario autenticado (`key` se arma
 * como `"${action}:${userId}"` en cada Route Handler, nunca por IP: la
 * IP es poco confiable detrás de proxies/NAT compartido y todas estas
 * acciones ya requieren sesión). Los números son deliberadamente
 * generosos para uso legítimo (nadie sincroniza o genera su Wrapped 10
 * veces por hora en el curso normal de usar el producto) y bajos para
 * un script que intente automatizar abuso.
 */
export const RATE_LIMITS = {
  // Dispara jobs reales contra la API de GitHub (Data Collector) -- el
  // más costoso en llamadas externas.
  sync: { limit: 5, windowMs: 60 * 60 * 1000 },
  // Dispara Analytics Engine + Insights Engine + narración por IA
  // (costo de tokens de Anthropic).
  wrappedGenerate: { limit: 10, windowMs: 60 * 60 * 1000 },
  // Escribe en la bandeja de otro usuario -- limita spam de invitaciones,
  // no solo costo de cómputo.
  comparisonInvite: { limit: 20, windowMs: 60 * 60 * 1000 },
  // Cómputo de `ImageResponse` (renderizado a PNG) bajo demanda.
  wrappedImage: { limit: 30, windowMs: 60 * 60 * 1000 },
  // Lee TODOS los commits del usuario (potencialmente decenas de miles)
  // y los serializa a JSON -- el más pesado de lectura de los cuatro,
  // ventana diaria en vez de horaria: nadie necesita exportar sus datos
  // más de un par de veces por día en uso legítimo.
  accountExport: { limit: 2, windowMs: 24 * 60 * 60 * 1000 }
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitedAction = keyof typeof RATE_LIMITS;
