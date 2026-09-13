import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotificationPreferences, setNotificationPreferences } from "@/lib/notifications/preferences";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const preferences = await getNotificationPreferences(session.user.id);
  return NextResponse.json(preferences);
}

/**
 * PATCH parcial (sección de `lib/notifications/preferences.ts`): el body
 * puede traer solo una de las dos preferencias, la otra no se toca.
 * Nunca acepta `userId` del body -- igual que `PATCH /wrapped`, solo
 * puede modificar las preferencias del propio usuario autenticado.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: { wrappedReadyEmail?: boolean; streakMilestoneEmail?: boolean } = {};

  if (body?.wrappedReadyEmail !== undefined) {
    if (typeof body.wrappedReadyEmail !== "boolean") {
      return NextResponse.json({ error: "wrappedReadyEmail debe ser boolean" }, { status: 400 });
    }
    updates.wrappedReadyEmail = body.wrappedReadyEmail;
  }

  if (body?.streakMilestoneEmail !== undefined) {
    if (typeof body.streakMilestoneEmail !== "boolean") {
      return NextResponse.json({ error: "streakMilestoneEmail debe ser boolean" }, { status: 400 });
    }
    updates.streakMilestoneEmail = body.streakMilestoneEmail;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const preferences = await setNotificationPreferences(session.user.id, updates);
  return NextResponse.json(preferences);
}
