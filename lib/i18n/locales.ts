/**
 * ⚠️ Fase 9: catálogo cerrado, misma convención que
 * `lib/notifications/types.ts` -- un array `as const` + union derivada.
 * Agregar un idioma nuevo es: 1) agregarlo acá, 2) agregar su diccionario
 * en `lib/i18n/dictionaries/`, 3) el test de paridad de claves
 * (`__tests__/dictionaries.test.ts`) falla hasta que el diccionario
 * nuevo tenga exactamente las mismas claves que `es` -- no hay forma de
 * agregar un idioma a medio traducir sin que el test lo marque.
 */
export const SUPPORTED_LOCALES = ["es", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value ?? "");
}

/** Nombre de la cookie usada para persistir el locale de visitantes no logueados. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
