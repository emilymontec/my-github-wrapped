import { test, expect } from "./fixtures/authenticated";

const PREVIOUS_YEAR = new Date().getUTCFullYear() - 1;

test.describe("Wrapped", () => {
  test("el año cerrado del seed muestra el deck de slides, no el CTA de generar", async ({ page }) => {
    await page.goto(`/wrapped/${PREVIOUS_YEAR}`);

    // e2e/seed.ts ya pre-generó el WrappedReport de PREVIOUS_YEAR -- no
    // debería aparecer el CTA de "generar", debería ir directo al deck.
    await expect(page.getByRole("button", { name: /generar mi wrapped/i })).toBeHidden();
    await expect(page.getByText(String(PREVIOUS_YEAR))).toBeVisible();
  });

  test("las flechas de navegación avanzan y retroceden slides", async ({ page }) => {
    await page.goto(`/wrapped/${PREVIOUS_YEAR}`);

    const nextZone = page.getByRole("button", { name: /siguiente slide/i });
    await nextZone.click();
    // El slide de "volumen" muestra el total de commits del seed (250).
    await expect(page.getByText("250")).toBeVisible();

    const prevZone = page.getByRole("button", { name: /slide anterior/i });
    await prevZone.click();
    await expect(page.getByText(String(PREVIOUS_YEAR))).toBeVisible();
  });

  test("el panel de compartir permite alternar público/privado", async ({ page }) => {
    await page.goto(`/wrapped/${PREVIOUS_YEAR}`);

    await page.getByRole("button", { name: /compartir/i }).click();
    await expect(page.getByText(/tu wrapped es privado/i)).toBeVisible();

    await page.getByRole("button", { name: /hacer público/i }).click();
    await page.waitForResponse((res) => res.url().includes("/wrapped") && res.ok());
    await expect(page.getByText(/tu wrapped es público/i)).toBeVisible();

    // Se revierte a privado al final para no dejar el fixture del seed
    // en un estado distinto al que empezó, si esta suite corre más de
    // una vez seguida contra la misma DB de test.
    await page.getByRole("button", { name: /hacer privado/i }).click();
    await page.waitForResponse((res) => res.url().includes("/wrapped") && res.ok());
  });

  test("un año sin WrappedReport todavía generado muestra el CTA de generar", async ({ page }) => {
    // Un año arbitrario sin datos en el seed (ni cerrado ni con reporte).
    await page.goto(`/wrapped/${PREVIOUS_YEAR - 5}`);
    await expect(page.getByRole("button", { name: /generar mi wrapped/i })).toBeVisible();
  });
});
