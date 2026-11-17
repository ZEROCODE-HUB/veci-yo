import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { CONDOMINIO, CUENTA, UNIDAD, servicio, sinError } from "./apoyo";

/**
 * La invitación decide sola el botón (16/11/2026, cliente: «se abre la app,
 * le muestra la invitación y pues la app decide si debe crear cuenta o
 * iniciar sesión»).
 *
 * Dos invitaciones a la 301 como corresidente, sin sesión abierta:
 *
 *   · a un correo **sin** cuenta: solo «Crear cuenta», y el registro llega
 *     con el correo puesto;
 *   · a uno **con** cuenta: solo «Iniciar sesión», el inicio llega con el
 *     correo puesto, y al entrar vuelve a la invitación, que se acepta.
 *
 * La cuenta invitada es de este recorrido, de usar y tirar: aceptar crea una
 * membresía de verdad. Es el único recorrido que escribe una contraseña en la
 * pantalla, porque lo que se comprueba es justamente el paso de entrar.
 */

const CLAVE = "Prueba123!";
const MARCA = "[prueba] e2e una sola forma";
const t = Date.now().toString(36);
const CON_CUENTA = `e2e.con.cuenta.${t}@veciyo.test`;
const SIN_CUENTA = `e2e.sin.cuenta.${t}@veciyo.test`;

let invitadaId = "";
const invitaciones: string[] = [];
const tokens: Record<string, string> = {};

async function invitar(correo: string, marcela: string) {
  const token = randomBytes(32).toString("hex");
  const fila = sinError(
    "invitación",
    await servicio
      .from("invitacion")
      .insert({
        condominio_id: CONDOMINIO,
        ambito: "unidad",
        unidad_id: UNIDAD.u301,
        rol_unidad: "corresidente",
        correo,
        nombre: `${MARCA} ${correo.split(".")[1]}`,
        token_hash: createHash("sha256").update(token).digest("hex"),
        invitada_por: marcela,
        expira_en: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      })
      .select("id")
      .single(),
  );
  invitaciones.push(fila.id);
  tokens[correo] = token;
}

test.beforeAll(async () => {
  const { data: usuarios } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  const marcela = usuarios.users.find((u) => u.email === CUENTA.admin)!.id;
  const { data, error } = await servicio.auth.admin.createUser({
    email: CON_CUENTA,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  invitadaId = data.user!.id;
  sinError(
    "perfil",
    await servicio.from("perfil").insert({ id: invitadaId, nombre: "Invitada", apellido: "De Prueba" }),
  );
  await invitar(CON_CUENTA, marcela);
  await invitar(SIN_CUENTA, marcela);
});

test.afterAll(async () => {
  if (invitadaId) {
    sinError("membresía", await servicio.from("membresia_unidad").delete().eq("usuario_id", invitadaId));
  }
  if (invitaciones.length) {
    sinError("invitaciones", await servicio.from("invitacion").delete().in("id", invitaciones));
  }
  if (invitadaId) {
    await servicio.from("perfil").delete().eq("id", invitadaId);
    const { error } = await servicio.auth.admin.deleteUser(invitadaId);
    if (error) throw new Error(`No se pudo retirar la cuenta: ${error.message}`);
  }
});

test("sin cuenta: solo «Crear cuenta», y el registro llega con su correo", async ({ page }) => {
  await page.goto(`/invitacion?token=${tokens[SIN_CUENTA]}`);
  await expect(page.getByText(/Todavía no tienes cuenta en Veciyo/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Iniciar sesión", { exact: true })).toHaveCount(0);

  await page.getByText("Crear cuenta", { exact: true }).click();
  await expect(page.locator(`input[value="${SIN_CUENTA}"]`)).toBeVisible();
});

test("con cuenta: solo «Iniciar sesión», entra y vuelve a la invitación para aceptarla", async ({ page }) => {
  await page.goto(`/invitacion?token=${tokens[CON_CUENTA]}`);
  await expect(page.getByText(/Ya tienes una cuenta con/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Crear cuenta", { exact: true })).toHaveCount(0);

  await page.getByText("Iniciar sesión", { exact: true }).click();
  // El correo ya está puesto: solo falta la contraseña.
  await expect(page.locator(`input[value="${CON_CUENTA}"]`)).toBeVisible();
  await page.getByPlaceholder("••••••••").fill(CLAVE);
  await page.getByText("Iniciar sesión", { exact: true }).last().click();

  // Al entrar, de vuelta en la invitación.
  await page.getByText("Aceptar invitación", { exact: true }).click({ timeout: 60_000 });
  await expect(page.getByText(/Ya formas parte de tu edificio/)).toBeVisible();

  const { data } = await servicio
    .from("membresia_unidad")
    .select("rol, activo")
    .eq("usuario_id", invitadaId)
    .eq("unidad_id", UNIDAD.u301);
  expect(data).toEqual([{ rol: "corresidente", activo: true }]);
});
