import { expect, test } from "@playwright/test";
import { CONDOMINIO, CUENTA, UNIDAD, entrarComo, enDias, servicio, sinError } from "./apoyo";

/**
 * Con un huésped alojado, las visitas de amigos son del huésped (10/11/2026).
 *
 * Al propietario se le tachan esas noches en el calendario de «Amigos o
 * familia». El 11/11/2026 no se tachaban **al entrar directo** a esa
 * pestaña: solo después de pasar por «Huésped temporal», porque la consulta
 * de las noches ocupadas solo se encendía allí. La prueba del componente no
 * lo vio porque le daba las fechas ya cargadas.
 */

const MARCA = "[prueba] e2e amigos";
let estancia: string | null = null;

// Diez días por delante: lejos de lo que abren las pruebas de la suite de RLS.
const LLEGA = enDias(40);
const SALE = enDias(43);

test.beforeAll(async () => {
  // Lo que dejó una corrida que murió a medias.
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
        fecha_desde: LLEGA,
        fecha_hasta: SALE,
        anotaciones_ingreso: MARCA,
      })
      .select("id")
      .single(),
  );
  estancia = visita.id;
  sinError(
    "huésped",
    await servicio.from("invitado").insert({ visita_id: estancia, nombre: `${MARCA} Lina`, es_titular: true }),
  );
});

test.afterAll(limpiar);

async function limpiar() {
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) {
    await servicio.from("invitado").delete().eq("visita_id", v.id);
    sinError("borrar estancia", await servicio.from("visita").delete().eq("id", v.id));
  }
}

/** Avanza el calendario hasta el mes de `iso`. */
async function irAlMes(page: import("@playwright/test").Page, iso: string) {
  const [anio, mes] = iso.split("-").map(Number);
  const hoy = new Date();
  const saltos = (anio - hoy.getFullYear()) * 12 + (mes - 1 - hoy.getMonth());
  for (let i = 0; i < saltos; i += 1) await page.getByLabel("Mes siguiente").first().click();
}

test("al propietario se le tachan las noches del huésped al abrir «Amigos o familia»", async ({ page }) => {
  await entrarComo(page, CUENTA.vecino, "propietario");
  // Sofía no vive en la 102 (se alquila por noches): no tiene la pestaña
  // Visitas, y entra por el botón del inicio.
  await page.getByText("Registrar una visita").first().click();
  // La tarjeta del tipo abre la pantalla nueva con «Amigos» ya elegido: es el
  // camino que fallaba.
  await page.getByText("Amigos Familiares").first().click();

  await irAlMes(page, LLEGA);
  const dia = (iso: string) => Number(iso.slice(8, 10));
  // Las noches: del día que llega al día antes de salir.
  await expect(page.getByLabel(`Dia ${dia(LLEGA)}, ya reservado`).first()).toBeVisible();
  await expect(page.getByText(/En los días tachados hay un huésped alojado/)).toBeVisible();
});
