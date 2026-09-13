import { test, expect } from "./fixtures/authenticated";

test.describe("Settings — idioma", () => {
  test("cambiar a inglés persiste tras recargar la página (cookie NEXT_LOCALE)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();

    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // ⚠️ El punto de este assert es la PERSISTENCIA vía cookie
    // (lib/i18n/resolve.ts), no solo el cambio optimista en memoria --
    // por eso se recarga la página entera en vez de solo re-renderizar.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Se revierte a español para no afectar al resto de los specs de
    // esta suite, que asumen textos en español por default.
    await page.getByRole("button", { name: "Español" }).click();
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
  });
});

test.describe("Settings — notificaciones", () => {
  test("los toggles de notificaciones reflejan el estado guardado y se pueden apagar/prender", async ({ page }) => {
    await page.goto("/settings");

    const wrappedReadyToggle = page.getByRole("switch").first();
    const initiallyChecked = await wrappedReadyToggle.getAttribute("aria-checked");

    await wrappedReadyToggle.click();
    await page.waitForResponse((res) => res.url().includes("/settings/notifications") && res.ok());
    await expect(wrappedReadyToggle).toHaveAttribute("aria-checked", initiallyChecked === "true" ? "false" : "true");

    // revertir
    await wrappedReadyToggle.click();
    await page.waitForResponse((res) => res.url().includes("/settings/notifications") && res.ok());
  });
});

test.describe("Settings — exportar datos", () => {
  test("solicitar un export muestra el estado 'generando' o el botón de descarga", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /solicitar export/i }).click();
    await page.waitForResponse((res) => res.url().includes("/account/export") && res.status() === 201);

    await expect(page.getByText(/en cola|generando tu export|tu export está listo/i)).toBeVisible();
  });
});

test.describe("Settings — eliminar cuenta (solo hasta la confirmación, nunca se ejecuta)", () => {
  test("el botón de confirmación final queda deshabilitado hasta tipear el username exacto", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /eliminar mi cuenta/i }).click();
    const confirmInput = page.getByPlaceholder(/tu-username/i);
    const confirmButton = page.getByRole("button", { name: /sí, eliminar mi cuenta para siempre/i });

    await expect(confirmButton).toBeDisabled();

    await confirmInput.fill("username-incorrecto");
    await expect(confirmButton).toBeDisabled();

    await confirmInput.fill("e2e-test-user"); // TEST_USERNAME de e2e/seed.ts
    await expect(confirmButton).toBeEnabled();

    // ⚠️ Deliberadamente NO se clickea `confirmButton` -- este test
    // verifica el GATING de la confirmación, no ejecuta el borrado real
    // (que además rompería el resto de la suite, ya que borra al mismo
    // usuario que usan todos los demás specs). El endpoint
    // `DELETE /account` en sí se cubre por separado a nivel API en
    // e2e/security.spec.ts contra un usuario descartable.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(confirmInput).toBeHidden();
  });
});
