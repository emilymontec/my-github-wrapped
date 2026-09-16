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
        //
        // ⚠️ Sistema de temas: estos valores son `rgb(var(--x) / <alpha-value>)`
        // en vez de hex fijo -- así CUALQUIER clase que ya use `cool.*`
        // (bg-cool-panel, text-cool-muted, border-cool-line/20, etc.,
        // usadas en decenas de componentes) responde sola al cambio de
        // tema sin tener que tocar cada archivo. Las variables reales
        // viven en `:root` / `[data-theme="light"]` en globals.css.
        cool: {
          ink: "rgb(var(--color-ink) / <alpha-value>)",
          panel: "rgb(var(--color-panel) / <alpha-value>)",
          line: "rgb(var(--color-line) / <alpha-value>)",
          violet: "rgb(var(--color-violet) / <alpha-value>)",
          violetBright: "rgb(var(--color-violet-bright) / <alpha-value>)",
          cyan: "rgb(var(--color-cyan) / <alpha-value>)",
          blue: "rgb(var(--color-blue) / <alpha-value>)",
          muted: "rgb(var(--color-muted) / <alpha-value>)",
          // Texto primario: blanco en oscuro, casi-negro en claro. Para
          // texto de contenido (títulos, párrafos) sobre el fondo de
          // página -- NO para texto sobre un botón de color sólido
          // (ese debe seguir siendo blanco fijo en los dos temas, ver
          // .btn-cool en globals.css).
          text: "rgb(var(--color-text) / <alpha-value>)"
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
