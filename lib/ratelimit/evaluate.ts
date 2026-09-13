/**
 * Separación deliberada (mismo patrón que `lib/i18n/resolve.ts` vs
 * `lib/i18n/server.ts`): esta lógica es pura y se testea sin DB.
 * `lib/ratelimit/index.ts` hace el único round-trip a Postgres (un
 * upsert atómico) y le pasa el `count`/`windowStart` resultante a
 * `evaluateRateLimit` para decidir si la request pasa.
 */

export interface RateLimitConfig {
  /** Cuántas requests se permiten dentro de la ventana. */
  limit: number;
  /** Duración de la ventana, en milisegundos. */
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  /** Requests restantes en la ventana actual (nunca negativo). */
  remaining: number;
  /** Segundos hasta que la ventana actual expire y el contador se resetee. */
  retryAfterSeconds: number;
}

/**
 * `count` y `windowStart` son el resultado YA incrementado de la fila en
 * DB (ver `lib/ratelimit/index.ts`) -- este helper solo decide si ese
 * conteo excede el límite, no hace ninguna escritura.
 */
export function evaluateRateLimit(
  count: number,
  windowStart: Date,
  now: Date,
  config: RateLimitConfig
): RateLimitDecision {
  const windowEnd = windowStart.getTime() + config.windowMs;
  const retryAfterSeconds = Math.max(0, Math.ceil((windowEnd - now.getTime()) / 1000));

  return {
    allowed: count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    retryAfterSeconds
  };
}
