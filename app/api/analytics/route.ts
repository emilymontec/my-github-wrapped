import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnalyticsWithScore } from "@/lib/analytics/service";
import { isPeriodOption } from "@/lib/dashboard/period";

// ⚠️ Fuerza render dinámico: estos endpoints dependen de sesión (cookies) y de estado que cambia todo el tiempo en la DB (período seleccionado, progreso de sync, si el Wrapped ya está listo). Sin
// esto, Next.js puede tratar el handler como estático/cacheable y servir la MISMA respuesta sin importar los query params o el estado real —
// exactamente el bug de "todos los períodos muestran lo mismo" / "el botón de sync nunca se actualiza".
export const dynamic = "force-dynamic";

/**
 * Route Handler deliberadamente "delgado" (sección 13): solo valida
 * sesión + parámetro y delega todo a lib/analytics/service.ts, que es la
 * misma función que usa el Server Component del dashboard para su render
 * inicial — un solo lugar calcula el rango de fechas para cada período.
 *
 * Devuelve `{ analytics, score }` desde la Fase 5 — el Developer Activity
 * Score viaja junto al resto de las métricas del período seleccionado.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const period = new URL(request.url).searchParams.get("period");
  if (!isPeriodOption(period)) {
    return NextResponse.json(
      { error: "period inválido. Usa: last30, calendarYear o rolling12." },
      { status: 400 }
    );
  }

  const result = await getAnalyticsWithScore(session.user.id, period);
  return NextResponse.json(result);
}
