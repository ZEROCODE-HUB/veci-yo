import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  enDias,
  entrarComo,
  retirarEstancia,
  salir,
  servicio,
  supabase,
  ventanaDe,
} from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import { estacionamientosDelPrecheckin } from "../../../../veciyo-web/src/lib/precheckin";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("los-estacionamientos-del-alojamiento");

/**
 * Recorrido: el huésped sabe cuántos estacionamientos ofrece el alojamiento.
 *
 * Hueco 17 (decidido el 25/10/2026): el número lo pone el anfitrión en
 * «Huéspedes temporales» y no se usaba para nada. Ahora la web avisa si se
 * registran más vehículos, y para eso tiene que poder leerlo con el enlace
 * del preregistro --el huésped no tiene sesión--.
 *
 * El número se fija aquí y se devuelve como estaba: la 102 la tocan varios
 * archivos y nadie más depende de este.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] estacionamientos";

let visitaId = "";
let token = "";
let antes: number | null = null;

beforeAll(async () => {
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("estacionamientos_huesped")
    .eq("unidad_id", U102)
    .single();
  if (error) throw new Error(`No se pudo leer la 102: ${error.message}`);
  antes = data.estacionamientos_huesped;

  const { error: errorFijar } = await servicio
    .from("suscripcion_renta_corta")
    .update({ estacionamientos_huesped: 2 })
    .eq("unidad_id", U102);
  if (errorFijar) throw new Error(`No se pudo fijar el número: ${errorFijar.message}`);

  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 3),
    fechaHasta: enDias(V + 6),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();
});

afterAll(async () => {
  const { error: errorDevolver } = await servicio
    .from("suscripcion_renta_corta")
    .update({ estacionamientos_huesped: antes })
    .eq("unidad_id", U102);
  if (errorDevolver) throw new Error(`No se pudo devolver el número: ${errorDevolver.message}`);
  if (visitaId) {
    const { error } = await retirarEstancia(visitaId);
    if (error) throw new Error(`No se pudo retirar la estancia: ${error.message}`);
  }
});

describe("con el enlace del preregistro", () => {
  it("el huésped lee los estacionamientos que fijó su anfitrión", async () => {
    // Sin sesión, como el huésped de verdad.
    expect(await estacionamientosDelPrecheckin(token, supabase as never)).toBe(2);
  });

  it("con un enlace que no vale no se lee nada", async () => {
    expect(await estacionamientosDelPrecheckin("no-es-un-enlace", supabase as never)).toBeNull();
  });
});
