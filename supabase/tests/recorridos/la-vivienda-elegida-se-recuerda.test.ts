import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  elegirUnidadActiva,
  obtenerResumenDeMisViviendas,
} from "@/shared/services/viviendaActiva.repo";

/**
 * Recorrido: la vivienda que alguien elige se recuerda, y su inicio resume
 * todas las suyas.
 *
 * Pedido por el cliente el 09/10/2026. Quien tiene mas de una vivienda entraba
 * «en la primera», que salia de una consulta sin orden; y lo que eligiera se
 * perdia al cerrar. Ahora se guarda --sobre lo propio-- y el inicio enseña
 * que pasa hoy en cada una.
 *
 * El caso de la regla 8 va con **Marcela**, que administra el edificio y
 * ademas es propietaria de la 301: con alguien de un solo papel, «mis
 * viviendas» y «lo que me deja ver RLS» son lo mismo y no se probaria nada.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U101 = "44444444-4444-4444-4444-444444444441";
const U205 = "44444444-4444-4444-4444-444444444442";
const U301 = "44444444-4444-4444-4444-444444444444";
// Guillermo: propietario de la 101 y de la 205.
const DOS_VIVIENDAS = "propietario@veciyo.test";
const ADMIN_Y_VECINA = "admin@veciyo.test";
const VECINA_DE_OTRA = "vecino@veciyo.test";
const MARCA = "[prueba] resumen de mis viviendas";

let guillermoId = "";
let visitaId = "";
/** Como estaban sus dos membresias, para devolverlas crudas. */
let comoEstaban: { id: string; unidad_id: string; elegida_en: string | null }[] = [];

async function elegidaEn(unidadId: string) {
  const { data } = await servicio
    .from("membresia_unidad")
    .select("elegida_en")
    .eq("usuario_id", guillermoId)
    .eq("unidad_id", unidadId)
    .eq("activo", true)
    .single();
  return data!.elegida_en as string | null;
}

beforeAll(async () => {
  guillermoId = await entrarComo(DOS_VIVIENDAS);
  await salir();

  const { data, error } = await servicio
    .from("membresia_unidad")
    .select("id, unidad_id, elegida_en")
    .eq("usuario_id", guillermoId)
    .in("unidad_id", [U101, U205])
    .eq("activo", true);
  if (error) throw new Error(error.message);
  comoEstaban = data ?? [];
  if (comoEstaban.length !== 2) {
    throw new Error("Guillermo tiene que ser miembro de la 101 y de la 205");
  }

  // Se parte de «nunca eligio», para que el primer caso mida su propio cambio.
  await servicio
    .from("membresia_unidad")
    .update({ elegida_en: null })
    .in("id", comoEstaban.map((m) => m.id));

  // Una visita de hoy en la 101, para que el resumen tenga algo que contar.
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA).eq("unidad_id", U101);
  const { data: visita, error: e2 } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U101,
      tipo: "amigos",
      anotaciones_ingreso: MARCA,
    })
    .select("id")
    .single();
  if (e2) throw new Error(e2.message);
  visitaId = visita.id;
});

afterAll(async () => {
  for (const m of comoEstaban) {
    await servicio
      .from("membresia_unidad")
      .update({ elegida_en: m.elegida_en })
      .eq("id", m.id);
  }
  if (visitaId) {
    const { error } = await servicio.from("visita").delete().eq("id", visitaId);
    if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);
  }
  await salir();
});

describe("elegir vivienda", () => {
  it("queda guardado en la suya, y la otra no cambia", async () => {
    await entrarComo(DOS_VIVIENDAS);
    await elegirUnidadActiva(U205);

    expect(await elegidaEn(U205)).toBeTruthy();
    expect(await elegidaEn(U101)).toBeNull();
  });

  it("al elegir la otra, esa pasa a ser la mas reciente", async () => {
    await entrarComo(DOS_VIVIENDAS);
    await elegirUnidadActiva(U101);

    const de101 = await elegidaEn(U101);
    const de205 = await elegidaEn(U205);
    expect(de101! > de205!).toBe(true);
  });

  it("una vivienda ajena no se puede elegir, y no toca la de su dueño", async () => {
    const antes = await elegidaEn(U205);

    await entrarComo(VECINA_DE_OTRA);
    await expect(elegirUnidadActiva(U205)).rejects.toThrow(/no es tuya/i);

    expect(await elegidaEn(U205)).toBe(antes);
  });
});

describe("el resumen de mis viviendas", () => {
  it("quien tiene dos, ve las dos, con lo que pasa hoy en cada una", async () => {
    await entrarComo(DOS_VIVIENDAS);
    const resumen = await obtenerResumenDeMisViviendas();
    const porUnidad = new Map(resumen.map((r) => [r.unidadId, r]));

    expect(porUnidad.has(U101)).toBe(true);
    expect(porUnidad.has(U205)).toBe(true);
    // La visita de hoy que puso este archivo.
    expect(porUnidad.get(U101)!.visitasHoy).toBeGreaterThanOrEqual(1);
  });

  it("quien administra el edificio ve la suya, no las de todos", async () => {
    /*
      Marcela puede leer las visitas de la 101 --las administra--. El resumen
      de **sus** viviendas no las enseña: su inicio como vecina es su casa.
    */
    await entrarComo(ADMIN_Y_VECINA);
    const resumen = await obtenerResumenDeMisViviendas();
    const unidades = resumen.map((r) => r.unidadId);

    expect(unidades).toContain(U301);
    expect(unidades).not.toContain(U101);
    expect(unidades).not.toContain(U205);
  });

  it("y una vecina de otra vivienda no ve las de Guillermo", async () => {
    await entrarComo(VECINA_DE_OTRA);
    const unidades = (await obtenerResumenDeMisViviendas()).map((r) => r.unidadId);
    expect(unidades).not.toContain(U101);
    expect(unidades).not.toContain(U205);
  });
});
