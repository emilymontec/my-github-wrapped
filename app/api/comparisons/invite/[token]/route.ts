import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptComparisonEmailInvite, declineComparisonEmailInvite } from "@/lib/comparisons/invites";

/**
 * Mismo espíritu que app/comparisons/[id]/route.ts (PATCH con
 * `action: "accept" | "decline"`), pero operando sobre un
 * ComparisonInvite por token en vez de un ComparisonLink por id -- la
 * persona invitada todavía puede no tener una fila en ComparisonLink en
 * absoluto (ver lib/comparisons/invites.ts).
 */
export async function PATCH(request: Request, { params }: { params: { token: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action debe ser 'accept' o 'decline'" }, { status: 400 });
  }

  const statusByError: Record<string, number> = {
    not_found: 404,
    already_resolved: 409,
    expired: 410,
    self: 400
  };

  if (action === "decline") {
    const result = await declineComparisonEmailInvite(params.token);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: statusByError[result.error] ?? 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await acceptComparisonEmailInvite(params.token, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: statusByError[result.error] ?? 400 });
  }

  return NextResponse.json({ comparisonLinkId: result.comparisonLinkId });
}
