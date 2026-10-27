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
import { crearVisita, eliminarVisita } from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("una-visita-que-entro-no-la-borra-el-vecino");

/**
 * Recorrido: una visita que ya entró no la borra el vecino (26/10/2026).
 *
 * Lo decidió el cliente el 12/10/2026 --es constancia de quién estuvo en el
 * edificio-- y solo lo respetaba el menú de la pantalla. La base dejaba
 * borrarla de las dos formas: poniendo `deleted_at` (lo que hace la app) y con
 * un DELETE directo.
 *
 * Cada caso negativo lleva al lado su control: la visita programada sí se
 * borra, la administración sí puede, y una estancia de huésped sigue siendo de
 * su anfitrión.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test";
/** Marcela administra el edificio. */
const ADMINISTRACION = "admin@veciyo.test";
const MARCA = "[prueba] visita que entró";

const creadas: string[] = [];

async function visitaDeAmigos(dia: number, entro: boolean) {
  await entrarComo(VECINA);
  const id = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    fechaDesde: enDias(V + dia),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} ${dia}` }],
  });
  await salir();
  creadas.push(id);
  // La entrada la marca la portería; aquí se pone directo, que no es el asunto.
  if (entro) {
    const { error } = await servicio
      .from("visita")
      .update({ estado: "ingresada", ingreso_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }
  return id;
}

async function sigueViva(id: string) {
  const { data } = await servicio.from("visita").select("id, deleted_at").eq("id", id).maybeSingle();
  return Boolean(data) && data!.deleted_at === null;
}

beforeAll(async () => {
  // Una prueba que crea algo lo retira antes, por si una corrida murió a medias.
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) await retirarEstancia(v.id);
});

afterAll(async () => {
  await salir();
  for (const id of creadas) {
    const { error } = await retirarEstancia(id);
    if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
  }
});

describe("una visita que ya entró", () => {
  it("la vecina no la retira desde la app", async () => {
    const id = await visitaDeAmigos(1, true);
    await entrarComo(VECINA);
    await expect(eliminarVisita(id)).rejects.toThrow(/constancia/);
    await salir();
    expect(await sigueViva(id)).toBe(true);
  });

  it("ni con un DELETE directo", async () => {
    const id = await visitaDeAmigos(2, true);
    await entrarComo(VECINA);
    const { error } = await supabase.from("visita").delete({ count: "exact" }).eq("id", id);
    await salir();
    expect(error?.message ?? "").toMatch(/constancia/);
    expect(await sigueViva(id)).toBe(true);
  });

  it("control: una visita programada sí la retira", async () => {
    const id = await visitaDeAmigos(3, false);
    await entrarComo(VECINA);
    await eliminarVisita(id);
    await salir();
    expect(await sigueViva(id)).toBe(false);
  });

  it("control: la administración sí puede retirar una que entró", async () => {
    const id = await visitaDeAmigos(4, true);
    await entrarComo(ADMINISTRACION);
    await eliminarVisita(id);
    await salir();
    expect(await sigueViva(id)).toBe(false);
  });

  it("control: una estancia de huésped que empezó la sigue retirando su anfitriona", async () => {
    await entrarComo(VECINA);
    const id = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U102,
      tipo: "huesped_temporal",
      fechaDesde: enDias(V + 10),
      fechaHasta: enDias(V + 12),
      anotacionesIngreso: MARCA,
      invitados: [{ nombre: `${MARCA} titular`, documentoNumero: "93009991", tipoDocumento: "cedula_ciudadania" }],
    });
    await salir();
    creadas.push(id);
    await servicio.from("visita").update({ estado: "ingresada" }).eq("id", id);

    await entrarComo(VECINA);
    await eliminarVisita(id);
    await salir();
    expect(await sigueViva(id)).toBe(false);
  });
});
