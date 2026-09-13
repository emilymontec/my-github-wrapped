import { es } from "@/lib/i18n/dictionaries/es";
import { en } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

/**
 * Import estático de los dos diccionarios (no dynamic `import()` por
 * locale): con solo 2 idiomas el costo de bundle de traer ambos es
 * insignificante, y esto es lo que permite que `getDictionary` sea una
 * función síncrona usable tanto en Server Components como en el
 * middleware de Edge Runtime, sin `await` ni code-splitting a resolver.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/**
 * Interpolación mínima de placeholders `{clave}` -- no es un motor de
 * i18n completo (sin pluralización, sin formateo de fechas/números):
 * el proyecto ya tiene ese problema resuelto en su propio dominio
 * (`lib/analytics` normaliza fechas por timezone, no por locale), así
 * que esto se mantiene deliberadamente simple. Si una clave de
 * `values` no aparece en el string, el placeholder se deja tal cual en
 * vez de fallar -- un typo en una interpolación no debe tirar abajo un
 * render ni un envío de email.
 */
export function t(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
