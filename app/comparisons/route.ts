import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComparisonRequest, listComparisonsForUser } from "@/lib/comparisons/service";
import { createComparisonEmailInvite } from "@/lib/comparisons/invites";
import { enforceRateLimit } from "@/lib/ratelimit/respond";

/**
 * Route Handler delgado — toda la lógica de negocio (unicidad del
 * vínculo, quién puede invitar a quién) vive en lib/comparisons/service.ts
 * y lib/comparisons/invites.ts.
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

  // ⚠️ Fase 10: esto escribe en la bandeja de OTRO usuario (o le manda
  // un email a alguien que ni siquiera tiene cuenta todavía) — el
  // límite acá no es solo costo de cómputo (como sync/wrapped), es
  // frenar spam de invitaciones hacia terceros. Mismo límite para los
  // dos modos (username/email): es la misma clase de acción.
  const limited = await enforceRateLimit("comparisonInvite", session.user.id);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!username && !email) {
    return NextResponse.json({ error: "username o email requerido" }, { status: 400 });
  }

  if (email) {
    const result = await createComparisonEmailInvite(session.user.id, email);
    if ("error" in result) {
      const status = result.error === "invalid_email" || result.error === "inviter_incomplete" ? 400 : 409;
      const messages: Record<string, string> = {
        invalid_email: "Esa dirección de email no parece válida.",
        self: "No puedes invitarte a ti mismo.",
        already_exists: "Ya existe una comparación (pendiente, aceptada o esperando respuesta) con ese usuario.",
        inviter_incomplete: "Tu cuenta todavía no terminó de configurarse — prueba de nuevo en un momento."
      };
      return NextResponse.json({ error: messages[result.error] }, { status });
    }

    if (result.kind === "existing_user") {
      return NextResponse.json({ kind: "existing_user", id: result.comparisonLinkId }, { status: 201 });
    }
    return NextResponse.json(
      { kind: "pending_invite", emailSent: result.emailSent },
      { status: 201 }
    );
  }

  const result = await createComparisonRequest(session.user.id, username);
  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 409;
    const messages: Record<string, string> = {
      not_found: "No existe ningún usuario con ese username en GitHub Wrapped.",
      self: "No puedes compararte contigo mismo.",
      already_exists: "Ya existe una comparación (pendiente, aceptada o esperando respuesta) con ese usuario."
    };
    return NextResponse.json({ error: messages[result.error] }, { status });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
