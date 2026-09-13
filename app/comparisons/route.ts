import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComparisonRequest, listComparisonsForUser } from "@/lib/comparisons/service";
import { enforceRateLimit } from "@/lib/ratelimit/respond";

/**
 * Route Handler delgado — toda la lógica de negocio (unicidad del
 * vínculo, quién puede invitar a quién) vive en lib/comparisons/service.ts.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const comparisons = await listComparisonsForUser(session.user.id);
  return NextResponse.json({ comparisons });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // ⚠️ Fase 10: esto escribe en la bandeja de OTRO usuario — el límite
  // acá no es solo costo de cómputo (como sync/wrapped), es frenar spam
  // de invitaciones hacia terceros.
  const limited = await enforceRateLimit("comparisonInvite", session.user.id);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  if (!username) {
    return NextResponse.json({ error: "username requerido" }, { status: 400 });
  }

  const result = await createComparisonRequest(session.user.id, username);
  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 409;
    const messages: Record<string, string> = {
      not_found: "No existe ningún usuario con ese username en GitHub Wrapped.",
      self: "No podés compararte con vos mismo.",
      already_exists: "Ya existe una comparación (pendiente, aceptada o esperando respuesta) con ese usuario."
    };
    return NextResponse.json({ error: messages[result.error] }, { status });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
