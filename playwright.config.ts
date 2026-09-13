import { defineConfig, devices } from "@playwright/test";

/**
 * ⚠️ Fase 12: estos tests corren contra una app DESPLEGADA de verdad
 * (Postgres real, Inngest real, sesión de Auth.js real) — no contra este
 * sandbox de desarrollo. Ninguno de los tres requisitos existe acá:
 * - `npx playwright install` no puede descargar binarios de navegador
 *   (`cdn.playwright.dev` no está en la allowlist de red del sandbox,
 *   mismo tipo de límite que bloquea `prisma generate` desde Fase 0).
 * - No hay una instancia de Postgres corriendo con el schema migrado.
 * - No hay credenciales reales de OAuth de GitHub para el flujo completo.
 *
 * Por eso esta suite se entrega escrita y con su sintaxis validada
 * (`npx playwright test --list`, `tsc --noEmit`), pero SIN ejecutar
 * contra un browser real en este entorno — ver README.md, sección
 * "Límites conocidos", Fase 12.
 *
 * `baseURL` se lee de `E2E_BASE_URL` para poder apuntar la misma suite
 * a un preview deploy de Vercel, staging, o `localhost:3000` en CI.
 *
 * ⚠️ Fase 13: `.github/workflows/ci.yml` (job `e2e`) ya invoca
 * `npm run test:e2e` con un Postgres real de servicio y el Inngest Dev
 * Server corriendo -- esta config está escrita para funcionar tanto ahí
 * como en desarrollo local, pero la primera corrida real en GitHub
 * Actions (con acceso de red que este sandbox no tiene) es la que la
 * termina de validar.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  timeout: 30_000,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  // ⚠️ Fase 13: en CI (`ci.yml`, job `e2e`) esto arranca la app de
  // producción (`next build && next start`) automáticamente antes de
  // correr los specs -- ahí no hay nada corriendo todavía. En desarrollo
  // local, `reuseExistingServer: true` hace que si ya tenés `npm run
  // dev` corriendo (ver README.md, Setup), Playwright lo reutilice en
  // vez de levantar una segunda instancia -- solo levanta la suya propia
  // como fallback si no encuentra nada respondiendo en `baseURL`.
  webServer: {
    command: "npm run build && npm run start",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } }
  ]
});
