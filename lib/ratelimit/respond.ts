import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, type RateLimitedAction } from "@/lib/ratelimit/index";

/**
 * Uso en un Route Handler (una línea, mismo espíritu "delgado" que el
 * resto de los endpoints -- ver comentarios en app/sync/route.ts):
 *
 * ```ts
 * const limited = await enforceRateLimit("sync", session.user.id);
 * if (limited) return limited;
 * ```
 *
 * Devuelve `null` cuando la request puede seguir, o una `NextResponse`
 * 429 lista para retornar cuando no. Headers `Retry-After` y
 * `X-RateLimit-*` son un estándar informal (no hay RFC final para
 * rate-limit headers) pero son los nombres que la mayoría de los
 * clientes HTTP y herramientas de debugging ya reconocen.
 */
export async function enforceRateLimit(action: RateLimitedAction, userId: string): Promise<NextResponse | null> {
  const decision = await checkRateLimit(`${action}:${userId}`, RATE_LIMITS[action]);

  if (decision.allowed) return null;

  return NextResponse.json(
    { error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfterSeconds),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(decision.remaining)
      }
    }
  );
}
