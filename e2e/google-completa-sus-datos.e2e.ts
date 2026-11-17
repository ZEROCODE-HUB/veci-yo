import { expect, test } from "@playwright/test";
import { entrarComo, servicio, sinError } from "./apoyo";

/**
 * Quien entra con Google completa el mismo formulario del registro antes de
 * entrar (17/11/2026, cliente: «quien entra con Google debe completar ese
 * mismo formulario»).
 *
 * No se puede entrar con Google de verdad desde una prueba: se crea una cuenta
 * de usar y tirar marcada como de Google (`app_metadata.provider`), que es lo
 * único que la app mira para pedir el formulario, y se abre la sesión por
 * código como en el resto de recorridos.
 */

const CLAVE = "Prueba123!";
const correo = `e2e.google.${Date.now().toString(36)}@veciyo.test`;
let id = "";

test.beforeAll(async () => {
  const { data, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: CLAVE,
    email_confirm: true,
    user_metadata: { full_name: "Gabriela Gómez" },
    app_metadata: { provider: "google", providers: ["google"] },
  });
  if (error) throw new Error(error.message);
  id = data.user!.id;
});

test.afterAll(async () => {
  if (!id) return;
  await servicio.from("perfil").delete().eq("id", id);
  const { error } = await servicio.auth.admin.deleteUser(id);
  if (error) throw new Error(`No se pudo retirar la cuenta: ${error.message}`);
});

test("sin teléfono ni documento, no entra hasta completar sus datos", async ({ page }) => {
  await entrarComo(page, correo, "propietario", "/", "Completa tus datos");
  await expect(page.getByText(/Entraste con Google/)).toBeVisible();

  await page.getByPlaceholder("300 123 4567").fill("3105559876");
  await page.getByText("Seleccionar", { exact: true }).click();
  await page.getByText("Cédula de ciudadanía", { exact: true }).last().click();
  await page.getByPlaceholder("N° de documento").fill("1012345678");
  await page.getByText("Acepto los").click();
  await page.getByText("Guardar y entrar", { exact: true }).click();

  // Ya dentro: la barra de abajo.
  await expect(page.getByText("Inicio", { exact: true }).last()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Completa tus datos")).toHaveCount(0);

  const perfil = sinError(
    "perfil",
    await servicio.from("perfil").select("nombre, telefono, identificacion").eq("id", id).single(),
  );
  expect(perfil).toEqual({ nombre: "Gabriela", telefono: "3105559876", identificacion: "1012345678" });
});
