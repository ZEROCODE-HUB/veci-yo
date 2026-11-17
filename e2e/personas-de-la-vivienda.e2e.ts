import { expect, test } from "@playwright/test";
import { CUENTA, UNIDAD, entrarComo, servicio, sinError } from "./apoyo";

/**
 * Quién vive en la vivienda (17/11/2026, plan aprobado por el cliente).
 *
 *   · El propietario anota a un niño que no usará la app: sin correo, y sale
 *     en su lista con «Sin app».
 *   · Un residente entra y no ve lo del propietario: invitar gente, servicios
 *     ni renta corta.
 */

const MARCA = "Niño Pruebasolo";
const CAPTURAS = process.env.E2E_CAPTURAS;
const correoResidente = `e2e.residente.${Date.now().toString(36)}@veciyo.test`;
let residenteId = "";

async function limpiarNino() {
  const { data } = await servicio.from("membresia_unidad").select("id").like("nombre", `${MARCA}%`);
  for (const fila of data ?? []) {
    sinError("borrar niño", await servicio.from("membresia_unidad").delete().eq("id", fila.id));
  }
}

test.beforeAll(async () => {
  await limpiarNino();
  const { data, error } = await servicio.auth.admin.createUser({
    email: correoResidente,
    password: "Prueba123!",
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  residenteId = data.user!.id;
  sinError("perfil", await servicio.from("perfil").insert({ id: residenteId, nombre: "Rita", apellido: "Residente" }));
  sinError(
    "membresía",
    await servicio
      .from("membresia_unidad")
      .insert({ unidad_id: UNIDAD.u101, usuario_id: residenteId, nombre: "Rita Residente", rol: "residente" }),
  );
});

test.afterAll(async () => {
  await limpiarNino();
  if (residenteId) {
    sinError("membresía", await servicio.from("membresia_unidad").delete().eq("usuario_id", residenteId));
    await servicio.from("perfil").delete().eq("id", residenteId);
    const { error } = await servicio.auth.admin.deleteUser(residenteId);
    if (error) throw new Error(`No se pudo retirar la cuenta: ${error.message}`);
  }
});

test("el propietario anota a un niño que no usará la app", async ({ page }) => {
  await entrarComo(page, CUENTA.admin, "propietario");
  await page.getByText("Viviendas", { exact: true }).last().click();
  await page.getByText("Configuración", { exact: true }).first().click();
  await page.getByText("Invitar a alguien a la vivienda").first().click();
  await page.getByPlaceholder("Ej. Ana Restrepo").fill(`${MARCA} Pérez`);
  await page.getByText("No", { exact: true }).last().click();
  await page.getByText("Es menor de edad").click();
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/nino-formulario.png` });
  await page.getByText("Agregar a la vivienda", { exact: true }).click();

  await expect(page.getByText(`${MARCA} Pérez`).filter({ visible: true }).first()).toBeVisible();
  // Recién agregado, el formulario vacío no sale con un error en rojo.
  await expect(page.getByText("Falta el nombre de la persona")).toHaveCount(0);
  await expect(page.getByText("Sin app").filter({ visible: true }).first()).toBeVisible();
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/nino-en-la-lista.png` });

  const { data } = await servicio
    .from("membresia_unidad")
    .select("usuario_id, puede_acceder, es_menor, rol")
    .like("nombre", `${MARCA}%`);
  expect(data).toEqual([{ usuario_id: null, puede_acceder: false, es_menor: true, rol: "residente" }]);
});

test("un residente no ve lo del propietario", async ({ page }) => {
  await entrarComo(page, correoResidente, "inquilino-lider");
  await page.getByText("Viviendas", { exact: true }).last().click();
  await page.getByText("Configuración", { exact: true }).first().click();
  // Control: sí entró a la configuración de su vivienda y ve a su gente.
  await expect(page.getByText("Rita Residente").first()).toBeVisible({ timeout: 30_000 });
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/residente-configuracion.png`, fullPage: true });
  await expect(page.getByText("Invitar a alguien a la vivienda")).toHaveCount(0);
  await expect(page.getByText(/Huéspedes temporales|Renta corta/)).toHaveCount(0);
  // La barra de arriba dice lo que es, no «Inquilino líder».
  await expect(page.getByText(/^Residente · /).first()).toBeVisible();
});
