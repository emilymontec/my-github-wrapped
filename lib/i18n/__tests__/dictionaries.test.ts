import { describe, expect, it } from "vitest";
import { es } from "@/lib/i18n/dictionaries/es";
import { en } from "@/lib/i18n/dictionaries/en";
import { getDictionary, t } from "@/lib/i18n/dictionary";

/** Extrae todas las rutas de claves de un objeto anidado, ej. "badges.streak_7.label". */
function collectKeyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([key, value]) => collectKeyPaths(value, prefix ? `${prefix}.${key}` : key));
}

describe("paridad de diccionarios es/en", () => {
  it("tienen exactamente las mismas claves", () => {
    const esKeys = collectKeyPaths(es).sort();
    const enKeys = collectKeyPaths(en).sort();

    expect(enKeys).toEqual(esKeys);
  });

  it("ninguna clave de hoja está vacía en ningún idioma", () => {
    for (const dict of [es, en]) {
      for (const path of collectKeyPaths(dict)) {
        const value = path.split(".").reduce<any>((acc, key) => acc[key], dict);
        expect(typeof value).toBe("string");
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getDictionary", () => {
  it("devuelve el diccionario correcto por locale", () => {
    expect(getDictionary("es").landing.connectButton).toBe("Conectar GitHub");
    expect(getDictionary("en").landing.connectButton).toBe("Connect GitHub");
  });
});

describe("t (interpolación)", () => {
  it("reemplaza placeholders presentes en values", () => {
    expect(t("Hola {name}", { name: "Emily" })).toBe("Hola Emily");
    expect(t("{a} y {b}", { a: "uno", b: "dos" })).toBe("uno y dos");
  });

  it("deja el placeholder intacto si falta en values", () => {
    expect(t("Hola {name}", {})).toBe("Hola {name}");
  });

  it("devuelve el template sin cambios si no se pasan values", () => {
    expect(t("texto fijo")).toBe("texto fijo");
  });

  it("interpola números convirtiéndolos a string", () => {
    expect(t("Racha de {n} días", { n: 30 })).toBe("Racha de 30 días");
  });
});
