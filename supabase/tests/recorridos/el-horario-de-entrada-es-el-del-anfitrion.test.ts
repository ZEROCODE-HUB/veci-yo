import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import { horarioDeCheckin } from "@/features/visitas/services/visitas.repo";
import { obtenerAlojamientoConfigRequest } from "@/features/huesped/services/huesped.service";

/**
 * Recorrido: el horario de entrada que rige en una vivienda de renta corta.
 *
 * Decidido con el cliente el 13/10/2026: manda el del anfitrión, dentro del
 * límite que ponga el edificio. Hasta entonces el huésped y la portería leían
 * solo el del edificio, y lo que el anfitrión configuraba no lo veía nadie.
 *
 * Va en la **205**, no en la 102: la 102 la escribe en paralelo
 * `anfitrion-configura-alojamiento`, y dos archivos cambiando el mismo horario
 * a la vez dan un rojo que no es de ninguno. El límite del edificio se pone
 * con una fila propia de `permiso_vivienda` para la 205, que se retira por su
 * id; el horario del anfitrión se guarda crudo y se devuelve al terminar.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const GUARDIA = "guardia@veciyo.test";
const VECINA = "vecino@veciyo.test"; // vive en la 102, no en la 205

let original: {
  checkin_desde: string | null;
  checkin_hasta: string | null;
  checkin_24h: boolean | null;
};
let permisoId = "";
let permisoEraNuestro = false;
let permisoOriginal: Record<string, string | null> | null = null;

const HORAS_DEL_EDIFICIO = [
  "corta_checkin_desde",
  "corta_checkin_hasta",
  "larga_checkin_desde",
  "larga_checkin_hasta",
] as const;

async function anfitrion(
  desde: string | null,
  hasta: string | null,
  todoElDia = false,
) {
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .update({
      checkin_desde: desde,
      checkin_hasta: hasta,
      checkin_24h: todoElDia,
    })
    .eq("unidad_id", U205)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("La 205 no tiene renta corta");
}

/** El mismo límite para la estancia corta y la larga: aquí no es el asunto. */
async function edificio(desde: string | null, hasta: string | null) {
  const { data, error } = await servicio
    .from("permiso_vivienda")
    .update({
      corta_checkin_desde: desde,
      corta_checkin_hasta: hasta,
      larga_checkin_desde: desde,
      larga_checkin_hasta: hasta,
    })
    .eq("id", permisoId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se encontró el permiso de la 205");
}

beforeAll(async () => {
  const { data: fila, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("checkin_desde, checkin_hasta, checkin_24h")
    .eq("unidad_id", U205)
    .single();
  if (error) throw error;
  original = fila;

  const { data: existente, error: errorPermiso } = await servicio
    .from("permiso_vivienda")
    .select(`id, ${HORAS_DEL_EDIFICIO.join(", ")}`)
    .eq("unidad_id", U205)
    .maybeSingle();
  if (errorPermiso) throw errorPermiso;

  if (existente) {
    const { id, ...horas } = existente as unknown as { id: string } & Record<
      string,
      string | null
    >;
    permisoId = id;
    permisoOriginal = horas;
  } else {
    const { data: creado, error: errorAlta } = await servicio
      .from("permiso_vivienda")
      .insert({ condominio_id: CONDOMINIO, unidad_id: U205 })
      .select("id")
      .single();
    if (errorAlta) throw errorAlta;
    permisoId = creado.id;
    permisoEraNuestro = true;
  }

  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();

  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .update(original)
    .eq("unidad_id", U205);
  if (error) throw error;

  if (permisoEraNuestro) {
    const { error: errorBaja } = await servicio
      .from("permiso_vivienda")
      .delete()
      .eq("id", permisoId);
    if (errorBaja) throw errorBaja;
  } else if (permisoOriginal) {
    const { error: errorVuelta } = await servicio
      .from("permiso_vivienda")
      .update(permisoOriginal)
      .eq("id", permisoId);
    if (errorVuelta) throw errorVuelta;
  }
});

const horas = async () => {
  const { desde, hasta } = await horarioDeCheckin(U205);
  return [desde?.slice(0, 5) ?? null, hasta?.slice(0, 5) ?? null];
};

describe("el horario de entrada de una vivienda", () => {
  it("es el del anfitrión, recortado al límite del edificio", async () => {
    await edificio("14:00", "20:00");
    await anfitrion("15:00", "22:00");

    // Empieza cuando dice el anfitrión y acaba cuando dice el edificio.
    expect(await horas()).toEqual(["15:00", "20:00"]);
  });

  it("y el huésped lee el mismo en la ficha del alojamiento", async () => {
    const ficha = await obtenerAlojamientoConfigRequest(U205);
    expect([ficha?.checkinDesde, ficha?.checkinHasta]).toEqual([
      "15:00",
      "20:00",
    ]);
  });

  it("sin límite del edificio, el del anfitrión entero", async () => {
    await edificio(null, null);
    expect(await horas()).toEqual(["15:00", "22:00"]);
  });

  it("si el anfitrión no puso ninguno, el del edificio", async () => {
    await edificio("14:00", "20:00");
    await anfitrion(null, null);
    expect(await horas()).toEqual(["14:00", "20:00"]);
  });

  it("«a cualquier hora» del anfitrión no pasa por encima del edificio", async () => {
    await anfitrion("00:00", "23:59", true);
    expect(await horas()).toEqual(["14:00", "20:00"]);
  });

  it("y si lo del anfitrión cae entero fuera del límite, vale el del edificio", async () => {
    await anfitrion("21:00", "23:00");
    expect(await horas()).toEqual(["14:00", "20:00"]);
  });

  it("quien no tiene que ver con esa vivienda no lo lee", async () => {
    await anfitrion("15:00", "19:00");
    // El control: la portería sí.
    expect(await horas()).toEqual(["15:00", "19:00"]);

    await salir();
    await entrarComo(VECINA);
    expect(await horas()).toEqual([null, null]);
  });
});
