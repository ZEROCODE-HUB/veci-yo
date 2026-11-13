import { expect, test } from "@playwright/test";
import { CONDOMINIO, CUENTA, UNIDAD, entrarComo, servicio, sinError } from "./apoyo";

/**
 * Un aviso dice de qué vivienda y de qué rol es, y antes de abrirlo pregunta
 * si hay que cambiar (10/11/2026, pedido del cliente).
 *
 * Marcela administra el edificio y es propietaria de la 301. Entrando como
 * administración le llega «Tu visita ingresó» de la 301: tiene que decir
 * «Depto 301 · Propietario» y, al tocarlo, preguntar antes de cambiarla de rol.
 */

const MARCA = "[prueba] e2e aviso de otro rol";
let visita = "";

test.beforeAll(async () => {
  await limpiar();
  const { data: usuarios } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  const marcela = usuarios.users.find((u) => u.email === CUENTA.admin)!.id;
  visita = sinError(
    "visita",
    await servicio
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: UNIDAD.u301,
        tipo: "amigos",
        estado: "ingresada",
        anotaciones_ingreso: MARCA,
      })
      .select("id")
      .single(),
  ).id;
  sinError(
    "aviso",
    await servicio.from("notificacion").insert({
      usuario_id: marcela,
      condominio_id: CONDOMINIO,
      tipo: "visita_ingreso",
      titulo: "Tu visita ingresó",
      mensaje: `${MARCA}: Pepe ya está dentro`,
      entidad_tipo: "visita",
      entidad_id: visita,
    }),
  );
});

test.afterAll(limpiar);

async function limpiar() {
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) {
    await servicio.from("notificacion").delete().eq("entidad_id", v.id);
    sinError("borrar visita", await servicio.from("visita").delete().eq("id", v.id));
  }
}

test("entrando como administración, el aviso de su vivienda dice de dónde es y pregunta antes de cambiar", async ({
  page,
}) => {
  await entrarComo(page, CUENTA.admin, "administrador");
  await page.getByLabel("Notificaciones").first().click();

  const aviso = page.getByText(`${MARCA}: Pepe ya está dentro`);
  await expect(aviso).toBeVisible();
  // Dice de qué vivienda (por su apodo, si tiene) y con qué rol.
  await expect(page.getByText(/· Propietario/).first()).toBeVisible();

  await aviso.click();
  await expect(page.getByText("Este aviso es de otro rol")).toBeVisible();
  await expect(page.getByText("Cambiar y ver")).toBeVisible();

  // «Ahora no» la deja donde estaba.
  await page.getByText("Ahora no").click();
  await expect(page.getByText("Este aviso es de otro rol")).toHaveCount(0);
});
