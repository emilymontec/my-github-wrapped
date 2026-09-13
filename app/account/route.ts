import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { deleteAccount } from "@/lib/account/delete";

/**
 * ⚠️ Requiere `confirmUsername` en el body, verificado contra el
 * username REAL del usuario en DB -- no alcanza con estar logueado y
 * mandar un DELETE vacío. Mismo espíritu que el flujo de dos pasos de
 * `PrivateReposToggle`/`AccountDangerZone` en el frontend, pero
 * reforzado también del lado servidor: un CSRF que lograra disparar un
 * DELETE sin body (o con el campo vacío) nunca alcanza a borrar nada,
 * porque el username del atacante no puede conocerlo de antemano sin
 * que el usuario ya se lo haya mostrado en su propia UI.
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const confirmUsername = typeof body?.confirmUsername === "string" ? body.confirmUsername.trim() : "";

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { username: true }
  });

  if (!user.username || confirmUsername !== user.username) {
    return NextResponse.json(
      { error: "El username de confirmación no coincide." },
      { status: 400 }
    );
  }

  await deleteAccount(session.user.id);

  // La sesión (strategy "database") queda huérfana apenas se borra el
  // User -- su fila en `Session` ya cayó en la misma cascada. `signOut`
  // limpia además la cookie del lado del cliente para que la próxima
  // navegación no dependa de que el middleware detecte la sesión rota.
  await signOut({ redirect: false }).catch(() => {});

  return NextResponse.json({ status: "deleted" });
}
