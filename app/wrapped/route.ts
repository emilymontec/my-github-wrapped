import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { inngest } from "@/lib/jobs/client";
import { resolveYearPeriod, isStale } from "@/lib/wrapped/period";
import { setWrappedVisibility } from "@/lib/wrapped/service";
import { enforceRateLimit } from "@/lib/ratelimit/respond";

// ⚠️ Fuerza render dinámico: estos endpoints dependen de sesión (cookies) y de estado que cambia todo el tiempo en la DB (período seleccionado, progreso de sync, si el Wrapped ya está listo). Sin
// esto, Next.js puede tratar el handler como estático/cacheable y servir la MISMA respuesta sin importar los query params o el estado real —
// exactamente el bug de "todos los períodos muestran lo mismo" / "el botón de sync nunca se actualiza".
export const dynamic = "force-dynamic";

/**
 * ⚠️ Este Route Handler NO genera el Wrapped — solo valida y encola
 * (mismo principio que /sync, sección 32). La generación real
 * (Analytics Engine + Insights Engine + IA) corre en
 * lib/jobs/wrapped.ts, vía Inngest.
 *
 * Reglas de negocio que SÍ viven aquí (antes de encolar, para no gastar
 * un job en algo que se va a rechazar):
 * - Año cerrado con reporte ya generado → 409, nunca se regenera.
 * - Año en curso con reporte reciente (< 15 min) → 200 sin encolar, para
 *   no permitir spamear la API de IA a fuerza de refrescar la página.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const year = Number(body?.year);
  if (!Number.isInteger(year) || year < 2008 || year > new Date().getUTCFullYear() + 1) {
    return NextResponse.json({ error: "year inválido" }, { status: 400 });
  }

  const userId = session.user.id;
  const { period, isClosed } = resolveYearPeriod(year);

  const existing = await prisma.wrappedReport.findUnique({
    where: { userId_periodStart_periodEnd: { userId, periodStart: period.start, periodEnd: period.end } }
  });

  if (existing && isClosed) {
    return NextResponse.json(
      { error: "Este año ya está cerrado y su Wrapped no se puede regenerar." },
      { status: 409 }
    );
  }

  if (existing && !isStale(existing.generatedAt)) {
    return NextResponse.json({ status: "already_fresh" });
  }

  // ⚠️ Fase 10: se chequea DESPUÉS de los early-returns de arriba (año
  // cerrado ya generado, año en curso todavía fresco) para no gastar
  // cupo del rate limit en requests que de todos modos no iban a encolar
  // un job — solo consume presupuesto un pedido que realmente va a
  // disparar Analytics Engine + Insights Engine + IA.
  const limited = await enforceRateLimit("wrappedGenerate", userId);
  if (limited) return limited;

  await inngest.send({ name: "wrapped/generate.requested", data: { userId, year } });

  return NextResponse.json({ status: "queued" });
}

/**
 * Polling liviano: solo confirma si YA existe un WrappedReport para el
 * año pedido (el cliente lo usa para saber cuándo recargar la página del
 * deck). No arma ni devuelve los slides — eso lo hace el Server Component
 * de `app/wrapped/[year]/page.tsx` vía `lib/wrapped/service.ts`.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "year inválido" }, { status: 400 });
  }

  const { period } = resolveYearPeriod(year);
  const report = await prisma.wrappedReport.findUnique({
    where: {
      userId_periodStart_periodEnd: { userId: session.user.id, periodStart: period.start, periodEnd: period.end }
    },
    select: { id: true }
  });

  return NextResponse.json({ status: report ? "ready" : "not_generated" });
}

/**
 * ⚠️ Compartir es una acción consciente del dueño, nunca un opt-out
 * (sección Consideraciones, Fase 4): este endpoint es el ÚNICO lugar del
 * sistema que puede activar `isPublic`, requiere sesión, y solo puede
 * modificar el propio reporte del usuario autenticado — no recibe ni
 * acepta un `userId` del body, siempre usa `session.user.id`.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const year = Number(body?.year);
  const isPublic = body?.isPublic;

  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "year inválido" }, { status: 400 });
  }
  if (typeof isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic debe ser boolean" }, { status: 400 });
  }

  const updated = await setWrappedVisibility(session.user.id, year, isPublic);
  if (!updated) {
    return NextResponse.json(
      { error: "No existe un Wrapped generado para ese año." },
      { status: 404 }
    );
  }

  return NextResponse.json({ isPublic });
}
