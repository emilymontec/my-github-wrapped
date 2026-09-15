import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wrapped: {
          bg: "#0d1117",
          card: "#161b22",
          border: "#21262d",
          accent: "#58a6ff",
          amber: "#e3b341"
        },
        // Paleta "fría" del rediseño (referencia: grid de bloques +
        // matriz de puntos sobre negro azulado). Independiente de `heat`
        // a propósito: heat codifica DATOS reales (intensidad de
        // commits) y no debe cambiar de significado solo porque el
        // chrome de la UI se rediseñó — ver comentario en globals.css.
        cool: {
          ink: "#05060c",
          panel: "#0a0d16",
          line: "#7c8cff",
          violet: "#8b5cf6",
          violetBright: "#a78bfa",
          cyan: "#22d3ee",
          blue: "#3b82f6",
          muted: "#8892b0"
        },
        // Escala de intensidad para el heatmap de actividad — deliberadamente
        // la misma convención visual del contribution graph de GitHub, ya que
        // es exactamente el vocabulario visual que el usuario ya reconoce
        // para "actividad de commits por día". No tiene sentido inventar una
        // paleta distinta para el mismo concepto.
        heat: {
          0: "#161b22",
          1: "#0e4429",
          2: "#006d32",
          3: "#26a641",
          4: "#39d353"
        }
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      }
    }
  },
  plugins: []
};

export default config;
