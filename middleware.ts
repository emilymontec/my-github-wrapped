import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isSupportedLocale } from "@/lib/i18n/locales";
import { parseAcceptLanguage } from "@/lib/i18n/resolve";

/**
 * ⚠️ Edge Runtime: este archivo corre en el Edge, no en Node -- el bug
 * documentado en Fase 0 fue exactamente `middleware.ts` importando algo
 * que arrastraba `node:crypto`. Este middleware solo toca
 * `next/server` + `lib/i18n/resolve.ts` (funciones puras, sin
 * dependencias de Node ni de Prisma), así que es seguro acá.
 *
 * Solo escribe la cookie si el visitante todavía no tiene una -- nunca
 * pisa una cookie existente (que puede venir de un cambio explícito de
 * idioma en /settings). Este es el único rol del middleware: la
 * resolución completa de locale (cookie > User.locale > header) vive en
 * `lib/i18n/server.ts::getRequestLocale`, que corre en cada Server
 * Component -- el middleware no necesita duplicar esa lógica, solo
 * asegurarse de que la cookie exista con un valor razonable desde la
 * primera visita.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(existing)) return response;

  const detected = parseAcceptLanguage(request.headers.get("accept-language"));
  if (detected) {
    response.cookies.set(LOCALE_COOKIE, detected, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }

  return response;
}

export const config = {
  // Excluye toda /api (los route handlers resuelven su propio locale
  // vía lib/i18n/server.ts cuando lo necesitan, no dependen de que el
  // middleware les setee la cookie) y los assets estáticos de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"]
};
