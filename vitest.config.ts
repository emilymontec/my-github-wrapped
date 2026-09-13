import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    environment: "node",
    // ⚠️ Fase 12: `e2e/**` usa el test runner de Playwright (`test`,
    // `expect` de "@playwright/test"), no el de Vitest -- ambos separan
    // por convención de nombre de archivo (`*.spec.ts`), así que sin
    // esta exclusión Vitest intenta ejecutar los specs de Playwright con
    // su propio runner y falla (API incompatible). `playwright.config.ts`
    // ya apunta `testDir` exclusivamente a `./e2e`, así que la separación
    // es simétrica: Vitest nunca toca `e2e/`, Playwright nunca toca el
    // resto del proyecto.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"]
  }
});
