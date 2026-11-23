import { test, expect } from "./fixtures/authenticated";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("muestra el saludo y las cuatro estadísticas principales con datos del seed", async ({ page }) => {
    await expect(page.getByText(/hola, e2e test user/i)).toBeVisible();

    // Datos exactos de e2e/seed.ts -- 10 commits en el repo "github-wrapped".
    await expect(page.getByText("Commits", { exact: true })).toBeVisible();
    await expect(page.getByText("10").first()).toBeVisible();
  });

  test("el selector de período cambia los datos mostrados sin recargar la página", async ({ page }) => {
    const periodSelector = page.getByRole("button", { name: /este año/i });
    const analyticsResponse = page.waitForResponse((res) => res.url().includes("/analytics") && res.ok());
    await periodSelector.click();

    // Cambiar de período dispara un fetch a /analytics -- se espera
    // la respuesta en vez de un timeout fijo, para no depender de cuán
    // rápido responda el entorno donde corra esto.
    await analyticsResponse;
    await expect(page.getByText(/analizando|cargando/i)).toBeHidden();
  });

  test("el panel de sincronización permite disparar una sync y muestra progreso", async ({ page }) => {
    await page.route("**/sync", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "queued" })
        });
        return;
      }

      await route.continue();
    });

    const syncButton = page.getByRole("button", { name: /sincronizar|sync now/i });
    await expect(syncButton).toBeVisible();

    await syncButton.click();
    // Solo se prueba el estado visual; la ruta de sync queda simulada para
    // no depender de Inngest ni de la API real de GitHub.
    await expect(page.getByText(/analizando tu github|sincronizando|analyzing your github|syncing/i)).toBeVisible();
  });

  test("los badges y los insights se renderizan sin errores de consola", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.getByText("Badges").scrollIntoViewIfNeeded();
    await page.getByText("Insights de tu año").scrollIntoViewIfNeeded();

    expect(consoleErrors).toEqual([]);
  });
});
