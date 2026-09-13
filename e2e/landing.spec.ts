import { test, expect } from "@playwright/test";

/**
 * Sin `storageState` -- deliberadamente sin sesión, para probar la
 * landing tal como la ve un visitante nuevo.
 */
test.describe("Landing", () => {
  test("muestra el título, el botón de conectar GitHub y la nota de privacidad", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "GitHub Wrapped" })).toBeVisible();
    await expect(page.getByRole("button", { name: /conectar github/i })).toBeVisible();
    await expect(page.getByText(/solo analizamos tus repositorios públicos/i)).toBeVisible();
  });

  test("respeta Accept-Language: en → landing en inglés en la primera visita", async ({ browser }) => {
    // ⚠️ `extraHTTPHeaders` en vez de `page.goto` simple -- necesitamos
    // controlar el header Accept-Language del REQUEST inicial, que es lo
    // que lee `middleware.ts` para sembrar la cookie NEXT_LOCALE (ver
    // lib/i18n/resolve.ts::parseAcceptLanguage). Un contexto nuevo sin
    // cookies previas simula a un visitante que nunca estuvo antes.
    const context = await browser.newContext({ extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" } });
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.getByText(/discover how you coded this year/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /connect github/i })).toBeVisible();

    await context.close();
  });

  test("clickear conectar GitHub redirige al flujo real de OAuth de GitHub", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /conectar github/i }).click();

    // ⚠️ Se verifica SOLO que la redirección llega al endpoint de
    // autorización real de GitHub -- nunca se completa el login (no hay
    // credenciales de una cuenta de GitHub dedicada a CI en este
    // proyecto). Eso es intencional: más allá de este punto es
    // infraestructura de un tercero, no código de este proyecto (ver
    // e2e/global-setup.ts para el bypass que usa el resto de la suite).
    await page.waitForURL(/github\.com\/login\/oauth\/authorize/, { timeout: 10_000 });
  });
});
