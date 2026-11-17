import { expect, test } from "@playwright/test";

/**
 * Se registró, fue a su correo a confirmar y el celular cerró la app
 * (17/11/2026, cliente: «mientras el usuario va a su app de gmail, capaz se le
 * cierre la app de VeciYo»). Al volver, el inicio de sesión trae su correo y le
 * dice que solo falta la contraseña. Se recuerda solo el correo.
 */
test("al volver sin sesión, el inicio de sesión trae el correo que estaba por confirmar", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("veciyo.correo_por_confirmar", "nueva.vecina@ejemplo.com");
  });
  await page.goto("/");
  await expect(page.getByText(/Creaste tu cuenta con nueva.vecina@ejemplo.com/)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('input[value="nueva.vecina@ejemplo.com"]')).toBeVisible();
});
