"use client";

import { useEffect, useState } from "react";

type Palette = "violet" | "yellow" | "red" | "green";

// Coinciden con los valores oscuros de cada `[data-palette]` en
// globals.css -- son solo para pintar el puntito de cada opción, la
// paleta real la aplican las variables CSS.
const SWATCHES: { value: Palette; hex: string; label: string }[] = [
  { value: "violet", hex: "#8b5cf6", label: "Violeta" },
  { value: "yellow", hex: "#f59e0b", label: "Amarillo" },
  { value: "red", hex: "#ef4444", label: "Rojo" },
  { value: "green", hex: "#22c55e", label: "Verde" }
];

/**
 * Eje independiente del tema claro/oscuro (ver ThemeToggle) -- este
 * controla el COLOR DE ACENTO, aplicado como `data-palette` en <html>.
 * "violet" es el default y no necesita atributo (mismo criterio que
 * "dark" en ThemeToggle: menos estado escrito en el DOM, un solo valor
 * "sin atributo" en vez de cuatro posibles).
 */
export function PaletteToggle() {
  const [palette, setPalette] = useState<Palette>("violet");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-palette");
    if (current === "yellow" || current === "red" || current === "green") {
      setPalette(current);
    }
  }, []);

  function select(next: Palette) {
    setPalette(next);
    if (next === "violet") {
      document.documentElement.removeAttribute("data-palette");
    } else {
      document.documentElement.setAttribute("data-palette", next);
    }
    try {
      localStorage.setItem("palette", next);
    } catch {
      // localStorage puede fallar (modo privado, cuota) -- el cambio
      // sigue aplicando para esta sesión, solo no persiste.
    }
  }

  return (
    <div className="btn-flat-outline flex items-center gap-1.5 !px-2.5 !py-2">
      {SWATCHES.map((swatch) => (
        <button
          key={swatch.value}
          type="button"
          onClick={() => select(swatch.value)}
          aria-label={swatch.label}
          aria-pressed={palette === swatch.value}
          title={swatch.label}
          className={`h-4 w-4 rounded-sm border-2 transition-transform ${
            palette === swatch.value ? "scale-110 border-cool-text" : "border-transparent hover:scale-105"
          }`}
          style={{ background: swatch.hex }}
        />
      ))}
    </div>
  );
}
