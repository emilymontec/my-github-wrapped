import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/lib/jobs/client";
import { enforceRateLimit } from "@/lib/ratelimit/respond";

// ⚠️ Fuerza render dinámico: estos endpoints dependen de sesión (cookies)
// y de estado que cambia todo el tiempo en la DB. Sin esto, Next.js
// puede tratar el handler como estático/cacheable y servir la MISMA
// respuesta sin importar el estado real.
export const dynamic = "force-dynamic";

// Si un sync lleva más de esto en QUEUED/RUNNING sin actualizarse, lo
// tratamos como abandonado (el job murió sin poder marcarse a sí mismo
// como FAILED — ej. la app de Inngest se desincronizó a mitad de una
// corrida, o un deploy mató la función). Antes, esto dejaba el botón
// mostrando "Sincronizando..." para siempre y bloqueaba cualquier
// reintento con un 409 hasta que alguien corría un UPDATE manual en la
// base. Ahora se autorepara solo.
const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutos

type SyncStateRow = Awaited<ReturnType<typeof prisma.syncState.findUnique>>;

/**
 * Lee el syncState y, si está "colgado" (QUEUED/RUNNING hace más de
 * STALE_AFTER_MS sin actualizarse), lo corrige en la base a FAILED antes
 * de devolverlo. GET y POST comparten esta función para que ninguno de
 * los dos pueda ver un estado colgado sin sanearlo.
 */
async function resolveSyncState(userId: string): Promise<SyncStateRow> {
  const syncState = await prisma.syncState.findUnique({ where: { userId } });
  if (!syncState) return syncState;

  const isActive = syncState.status === "RUNNING" || syncState.status === "QUEUED";
  const isStale = Date.now() - syncState.updatedAt.getTime() > STALE_AFTER_MS;

  if (isActive && isStale) {
    return prisma.syncState.update({
      where: { userId },
      data: {
        status: "FAILED",
        errorMessage: "La sincronización anterior no terminó a tiempo. Probá de nuevo."
      }
    });
  }

  return syncState;
}

/**
 * ⚠️ Este Route Handler NO sincroniza nada por sí mismo — solo valida la
 * sesión y encola el evento. El trabajo real ocurre en
 * lib/jobs/sync.ts, ejecutado por Inngest fuera del ciclo de vida de
 * esta request (sección 32). Esto es intencional: cualquier lógica pesada
 * aquí volvería a introducir el problema de timeout serverless.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // ⚠️ Fase 10: encolar un sync dispara llamadas reales a la API de
  // GitHub (Data Collector) — este límite es nuestro, independiente del
  // rate limit propio de GitHub que ya maneja esa capa (ver
  // lib/ratelimit/index.ts).
  const limited = await enforceRateLimit("sync", session.user.id);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const mode: "initial" | "incremental" | "full" =
    body?.mode === "full" || body?.mode === "incremental" ? body.mode : "initial";

  const syncState = await resolveSyncState(session.user.id);
  if (syncState?.status === "RUNNING" || syncState?.status === "QUEUED") {
    return NextResponse.json({ error: "Ya hay una sincronización en curso" }, { status: 409 });
  }

  await prisma.syncState.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, status: "QUEUED" },
    update: { status: "QUEUED", progress: 0, errorMessage: null }
  });

  // ⚠️ Corrección: si el envío del evento a Inngest falla (red, app no
  // sincronizada, lo que sea), NO podemos dejar `syncState` colgado en
  // QUEUED — eso es exactamente lo que dejó el botón de sync trabado en
  // "Sincronizando..." para siempre, porque cada intento posterior
  // chocaba con el guard de arriba (RUNNING/QUEUED → 409) sin que nada
  // volviera a intentar encolar. Si el send() falla, revertimos a FAILED
  // con mensaje, para que el usuario pueda reintentar de inmediato.
  try {
    await inngest.send({
      name: "sync/user.requested",
      data: { userId: session.user.id, mode }
    });
  } catch (error) {
    await prisma.syncState.update({
      where: { userId: session.user.id },
      data: {
        status: "FAILED",
        errorMessage: "No se pudo encolar la sincronización. Probá de nuevo."
      }
    });
    return NextResponse.json(
      { error: "No se pudo encolar la sincronización" },
      { status: 502 }
    );
  }

  return NextResponse.json({ status: "queued" });
}

// El frontend hace polling de este endpoint para el indicador de progreso
// (sección 32: "Analyzing your GitHub... 78%").
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const syncState = await resolveSyncState(session.user.id);
  return NextResponse.json(syncState ?? { status: "IDLE", progress: 0 });
}
