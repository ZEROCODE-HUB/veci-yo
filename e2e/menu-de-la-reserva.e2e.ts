import { expect, test, type Page } from "@playwright/test";
import { CONDOMINIO, CUENTA, UNIDAD, entrarComo, enDias, servicio, sinError } from "./apoyo";

/**
 * Los tres puntos de una reserva de huésped (10/11/2026, decidido con el
 * cliente): «Abrir la reserva» siempre; «Eliminar» solo si no entró nadie;
 * con alguien dentro, «Terminar estancia». El 10/11 el cliente vio «Editar»,
 * que abría un modal donde no se podía editar nada.
 */

const MARCA = "[prueba] e2e menú";
const TITULAR = `${MARCA} Lina`;
let estancia = "";

test.beforeAll(async () => {
  await limpiar();
  const visita = sinError(
    "estancia",
    await servicio
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: UNIDAD.u102,
        tipo: "huesped_temporal",
        estado: "programada",
        fecha_desde: enDias(45),
        fecha_hasta: enDias(47),
        anotaciones_ingreso: MARCA,
      })
      .select("id")
      .single(),
  );
  estancia = visita.id;
  sinError(
    "titular",
    await servicio.from("invitado").insert({ visita_id: estancia, nombre: TITULAR, es_titular: true }),
  );
});

test.afterAll(limpiar);

async function limpiar() {
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) {
    await servicio.from("notificacion").delete().eq("entidad_id", v.id);
    await servicio.from("invitado").delete().eq("visita_id", v.id);
    sinError("borrar estancia", await servicio.from("visita").delete().eq("id", v.id));
  }
}

/** Abre los tres puntos de la tarjeta que lleva el nombre del titular. */
async function abrirMenu(page: Page) {
  // Sofía no vive en la 102: las visitas están en Viviendas › Visitas.
  await page.getByText("Viviendas", { exact: true }).last().click();
  await page.getByText("Visitas", { exact: true }).last().click();
  const tarjeta = page
    .locator("div")
    .filter({ has: page.getByText(TITULAR) })
    .filter({ has: page.getByLabel("Opciones de esta reserva") })
    .last();
  await tarjeta.getByLabel("Opciones de esta reserva").click();
}

test("sin nadie dentro: «Abrir la reserva» y «Eliminar», y ya no sale «Editar»", async ({ page }) => {
  await entrarComo(page, CUENTA.vecino, "propietario");
  await abrirMenu(page);
  await expect(page.getByText("Abrir la reserva")).toBeVisible();
  await expect(page.getByText("Eliminar", { exact: true })).toBeVisible();
  await expect(page.getByText("Editar", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Terminar estancia")).toHaveCount(0);
});

test("con alguien dentro: «Terminar estancia», y no «Eliminar»", async ({ page }) => {
  sinError(
    "entrada",
    await servicio.from("invitado").update({ llego: true, ingreso_en: new Date().toISOString() }).eq("visita_id", estancia),
  );
  sinError("estado", await servicio.from("visita").update({ estado: "ingresada" }).eq("id", estancia));

  await entrarComo(page, CUENTA.vecino, "propietario");
  await abrirMenu(page);
  await expect(page.getByText("Terminar estancia")).toBeVisible();
  await expect(page.getByText("Eliminar", { exact: true })).toHaveCount(0);
});
