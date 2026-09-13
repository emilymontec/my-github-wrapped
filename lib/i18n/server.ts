import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { resolveLocale } from "@/lib/i18n/resolve";
import { getDictionary } from "@/lib/i18n/dictionary";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales";

/**
 * ⚠️ Server-only a propósito (usa `next/headers` + Prisma) -- la lógica
 * pura y testeable vive en `lib/i18n/resolve.ts::resolveLocale`, este
 * archivo solo la conecta con las APIs de Next.js/DB. No se puede
 * unit-testear sin mockear medio Next.js, así que se mantiene lo más
 * fino posible (una función, sin ramas propias) y se confía en los
 * tests de `resolve.ts` para la lógica real.
 *
 * La consulta a `User.locale` solo se hace si hay sesión -- mismo costo
 * que ya paga cualquier página que llama `auth()` y después una query
 * propia (ver `getPrivateReposStatus`), no se agrega una query nueva
 * para visitantes anónimos.
 */
export async function getRequestLocale(): Promise<Locale> {
  const [session, cookieStore, headerStore] = await Promise.all([auth(), cookies(), headers()]);

  const userLocale = session?.user?.id
    ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { locale: true } }))?.locale
    : null;

  return resolveLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value,
    userLocale,
    acceptLanguageHeader: headerStore.get("accept-language")
  });
}

/** Atajo para el caso común: locale + su diccionario en una sola llamada. */
export async function getRequestDictionary() {
  const locale = await getRequestLocale();
  return { locale, dict: getDictionary(locale) };
}
