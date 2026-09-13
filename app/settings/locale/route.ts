import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { LOCALE_COOKIE, isSupportedLocale } from "@/lib/i18n/locales";

/**
 * ⚠️ Funciona para visitantes anónimos y logueados por igual (a
 * diferencia de `/settings/notifications`, que requiere sesión):
 * el idioma es una preferencia de la interfaz, no un dato del usuario
 * que amerite auth -- la landing page también necesita poder cambiarlo.
 * Si hay sesión, además persiste en `User.locale` para que la próxima
 * visita desde otro dispositivo/navegador respete la preferencia (ver
 * prioridad documentada en `lib/i18n/resolve.ts`).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!isSupportedLocale(body?.locale)) {
    return NextResponse.json({ error: "Locale no soportado" }, { status: 400 });
  }

  const locale = body.locale;

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
