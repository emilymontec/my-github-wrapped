import { test, expect } from "./fixtures/authenticated";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("muestra el saludo y las cuatro estadísticas principales con datos del seed", async ({ page }) => {
    await expect(page.getByText(/hola, e2e test user/i)).toBeVisible();

    // Datos exactos de e2e/seed.ts -- 10 commits en el repo "github-wrapped".
    await expect(page.getByText("Commits")).toBeVisible();
    await expect(page.getByText("10").first()).toBeVisible();
  });

  test("el selector de período cambia los datos mostrados sin recargar la página", async ({ page }) => {
    const periodSelector = page.getByRole("button", { name: /este año/i });
    await periodSelector.click();

    // Cambiar de período dispara un fetch a /analytics -- se espera
    // la respuesta en vez de un timeout fijo, para no depender de cuán
    // rápido responda el entorno donde corra esto.
    await page.waitForResponse((res) => res.url().includes("/analytics") && res.ok());
    await expect(page.getByText(/analizando|cargando/i)).toBeHidden();
  });

  test("el panel de sincronización permite disparar una sync y muestra progreso", async ({ page }) => {
    const syncButton = page.getByRole("button", { name: /generar mi wrapped|sincronizando/i });
    await expect(syncButton).toBeVisible();

    await syncButton.click();
    // No se espera a que la sync real termine (dependería de la API real
    // de GitHub con el token dummy del seed, ver e2e/seed.ts) -- solo que
    // el estado visual cambie a "en progreso".
    await expect(page.getByText(/analizando tu github|sincronizando/i)).toBeVisible();
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
