import { expect, test } from "@playwright/test";
import { servicio } from "./apoyo";

/**
 * Se registró, fue a su correo a buscar el código y el celular cerró la app
 * (17/11/2026, cliente: «cuando le sale esa pantalla de Confirma tu correo, el
 * usuario no está logueado… lo adecuado sería que sí esté»).
 *
 * Al volver, la app pide el código de 6 cifras con su correo puesto, y al
 * escribirlo queda dentro sin pedir la contraseña.
 *
 * La cuenta se crea sin confirmar con `generateLink`, que devuelve el código
 * **sin mandar ningún correo**: es el mismo código que llevaría el mensaje.
 */

const correo = `e2e.codigo.${Date.now().toString(36)}@veciyo.test`;
let id = "";
let codigo = "";

test.beforeAll(async () => {
  const { data, error } = await servicio.auth.admin.generateLink({
    type: "signup",
    email: correo,
    password: "Prueba123!",
    options: { data: { full_name: "Celia Código", telefono: "3105550000", codigo_pais: "CO" } },
  });
  if (error) throw new Error(error.message);
  id = data.user.id;
  codigo = data.properties.email_otp;
});

test.afterAll(async () => {
  if (!id) return;
  await servicio.from("perfil").delete().eq("id", id);
  const { error } = await servicio.auth.admin.deleteUser(id);
  if (error) throw new Error(`No se pudo retirar la cuenta: ${error.message}`);
});

test("al volver, escribe el código y queda dentro", async ({ page }) => {
  expect(codigo).toMatch(/^\d{6}$/);
  await page.addInitScript((pendiente) => {
    localStorage.setItem("veciyo.correo_por_confirmar", pendiente);
  }, correo);
  await page.goto("/");
  await expect(page.getByText(new RegExp(`código de 6 cifras a ${correo.replace(/\./g, "\\.")}`))).toBeVisible({
    timeout: 60_000,
  });

  await page.getByPlaceholder("123456").fill(codigo);
  await page.getByText("Entrar", { exact: true }).click();

  // Dentro: la barra de abajo, y el código ya no se pide.
  await expect(page.getByText("Inicio", { exact: true }).last()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Revisa tu correo")).toHaveCount(0);
  const { data } = await servicio.auth.admin.getUserById(id);
  expect(data.user?.email_confirmed_at).toBeTruthy();
});
