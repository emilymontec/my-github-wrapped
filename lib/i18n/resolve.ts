import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "@/lib/i18n/locales";

/**
 * Parsea un header `Accept-Language` (ej. "en-US,en;q=0.9,es;q=0.8") y
 * devuelve el primer idioma soportado, en el orden de preferencia del
 * navegador -- no implementa el peso `q` completo (no hace falta:
 * los navegadores ya mandan el header ordenado de mayor a menor
 * preferencia), solo compara el subtag de idioma base ("en" de "en-US").
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter((part): part is string => Boolean(part));

  for (const candidate of candidates) {
    const base = candidate.split("-")[0];
    if (isSupportedLocale(base)) return base;
  }

  return null;
}

export interface ResolveLocaleParams {
  /** Valor de la cookie NEXT_LOCALE, si existe. */
  cookieLocale?: string | null;
  /** `User.locale` de la DB, si hay sesión. */
  userLocale?: string | null;
  acceptLanguageHeader?: string | null;
}

/**
 * ⚠️ Orden de prioridad (documentado en el schema, sección Fase 9):
 * 1. Cookie -- es la señal más reciente: la escribe tanto el middleware
 *    en la primera visita (a partir de Accept-Language) como el switcher
 *    de /settings cuando el usuario cambia de idioma a mano. Siempre
 *    gana porque representa la última decisión explícita o detectada.
 * 2. `User.locale` -- si no hay cookie (ej. primera request a la API
 *    desde un cliente que no manda cookies) pero sí sesión.
 * 3. `Accept-Language` del request.
 * 4. `DEFAULT_LOCALE` ("es").
 */
export function resolveLocale(params: ResolveLocaleParams): Locale {
  const { cookieLocale, userLocale, acceptLanguageHeader } = params;

  if (isSupportedLocale(cookieLocale)) return cookieLocale;
  if (isSupportedLocale(userLocale)) return userLocale;

  const fromHeader = parseAcceptLanguage(acceptLanguageHeader);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}
