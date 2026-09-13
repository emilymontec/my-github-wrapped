import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { respondToComparison } from "@/lib/comparisons/service";

/**
 * ⚠️ "accept" solo lo puede ejecutar el destinatario del vínculo;
 * "revoke" lo puede ejecutar cualquiera de las dos partes, en cualquier
 * momento (antes o después de aceptar) — ver lib/comparisons/service.ts
 * para el detalle completo de por qué está diseñado así.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "accept" && action !== "revoke") {
    return NextResponse.json({ error: "action debe ser 'accept' o 'revoke'" }, { status: 400 });
  }

  const result = await respondToComparison(session.user.id, params.id, action);
  if ("error" in result) {
    const statusByError: Record<string, number> = {
      not_found: 404,
      forbidden: 403,
      only_recipient_can_accept: 403,
      invalid_state: 409
    };
    return NextResponse.json({ error: result.error }, { status: statusByError[result.error] ?? 400 });
  }

  return NextResponse.json({ status: result.status });
}
