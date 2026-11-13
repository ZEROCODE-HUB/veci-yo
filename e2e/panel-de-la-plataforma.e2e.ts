import { expect, test } from "@playwright/test";
import { crearDuenoDePrueba, entrarComo } from "./apoyo";

/**
 * El panel de la plataforma, recortado (13/11/2026, pedido del cliente): solo
 * la pantalla principal y Usuarios; en la ficha de una cuenta, ni «Suspender»
 * ni «Enviar correo para poner contraseña». El código de lo oculto sigue.
 */

let dueno: Awaited<ReturnType<typeof crearDuenoDePrueba>>;

test.beforeAll(async () => {
  dueno = await crearDuenoDePrueba("e2e-panel");
});

test.afterAll(async () => {
  await dueno?.retirar();
});

test("solo quedan Edificios y Usuarios, y la ficha no ofrece suspender ni el correo", async ({ page }) => {
  await entrarComo(page, dueno.correo, "plataforma", "/", "Edificios");

  await expect(page.getByText("Usuarios", { exact: true }).last()).toBeVisible();
  for (const oculta of ["Ajustes", "Soporte", "Más"]) {
    await expect(page.getByText(oculta, { exact: true })).toHaveCount(0);
  }

  await page.getByText("Usuarios", { exact: true }).last().click();
  await page.getByLabel(/^Ficha de /).first().click();
  await expect(page.getByText(/Alta \d/).first()).toBeVisible();
  await expect(page.getByText("Suspender la cuenta")).toHaveCount(0);
  await expect(page.getByText("Enviar correo para poner contraseña")).toHaveCount(0);
});
