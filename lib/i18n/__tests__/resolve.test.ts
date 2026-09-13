import { describe, expect, it } from "vitest";
import { parseAcceptLanguage, resolveLocale } from "@/lib/i18n/resolve";

describe("parseAcceptLanguage", () => {
  it("devuelve null si el header es null/undefined/vacío", () => {
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage(undefined)).toBeNull();
    expect(parseAcceptLanguage("")).toBeNull();
  });

  it("reconoce el subtag base ignorando la región", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(parseAcceptLanguage("es-AR,es;q=0.9")).toBe("es");
  });

  it("devuelve el primer idioma soportado en orden de preferencia", () => {
    // fr no está soportado -- debe saltarlo y usar el siguiente candidato
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,es;q=0.8")).toBe("es");
  });

  it("devuelve null si ningún idioma del header está soportado", () => {
    expect(parseAcceptLanguage("fr-FR,de-DE;q=0.9")).toBeNull();
  });
});

describe("resolveLocale", () => {
  it("prioriza la cookie por encima de todo", () => {
    const locale = resolveLocale({
      cookieLocale: "en",
      userLocale: "es",
      acceptLanguageHeader: "es-AR"
    });
    expect(locale).toBe("en");
  });

  it("ignora una cookie inválida y usa userLocale", () => {
    const locale = resolveLocale({
      cookieLocale: "fr", // no soportado
      userLocale: "en",
      acceptLanguageHeader: "es-AR"
    });
    expect(locale).toBe("en");
  });

  it("usa el header si no hay cookie ni userLocale", () => {
    const locale = resolveLocale({
      cookieLocale: null,
      userLocale: null,
      acceptLanguageHeader: "en-GB"
    });
    expect(locale).toBe("en");
  });

  it("cae al default si nada aplica", () => {
    const locale = resolveLocale({
      cookieLocale: null,
      userLocale: null,
      acceptLanguageHeader: "fr-FR"
    });
    expect(locale).toBe("es");
  });
});
