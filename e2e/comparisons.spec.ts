import { test, expect } from "./fixtures/authenticated";

/**
 * ⚠️ Alcance acotado a propósito: probar el flujo COMPLETO (aceptar,
 * ver la comparación con ambos lados) requeriría un segundo usuario de
 * test autenticado simultáneamente, con su propio storageState -- no
 * imposible, pero es una pieza de infraestructura de test aparte
 * (segundo seed + segunda sesión) que no se justifica para esta primera
 * pasada de E2E. Lo que sí se cubre acá es lo que el usuario ve y puede
 * disparar desde su propia sesión: la lista vacía, el formulario de
 * invitación, y el manejo de un username inexistente.
 */
test.describe("Comparaciones", () => {
  test("la página muestra el formulario de invitación y la lista (vacía en el seed)", async ({ page }) => {
    await page.goto("/compare");

    await expect(page.getByRole("heading", { name: "Comparaciones" })).toBeVisible();
    await expect(page.getByPlaceholder(/username de github/i)).toBeVisible();
    await expect(page.getByText(/todavía no tenés ninguna comparación/i)).toBeVisible();
  });

  test("invitar a un username que no existe muestra un error, no un crash", async ({ page }) => {
    await page.goto("/compare");

    await page.getByPlaceholder(/username de github/i).fill("usuario-que-no-existe-e2e-12345");
    await page.getByRole("button", { name: /invitar a comparar/i }).click();

    await expect(page.getByText(/no se pudo enviar la invitación|no encontrado/i)).toBeVisible();
  });
});
