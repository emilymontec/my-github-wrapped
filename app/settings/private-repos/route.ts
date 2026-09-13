import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrivateReposStatus, setPrivateReposEnabled } from "@/lib/settings/service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const status = await getPrivateReposStatus(session.user.id);
  return NextResponse.json(status);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled debe ser boolean" }, { status: 400 });
  }

  const result = await setPrivateReposEnabled(session.user.id, body.enabled);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Primero conectá el acceso a repos privados con el botón de arriba." },
      { status: 409 }
    );
  }

  return NextResponse.json({ enabled: body.enabled });
}
