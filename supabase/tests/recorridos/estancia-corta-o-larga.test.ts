import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";

/**
 * Recorrido: dónde acaba una estancia corta, y qué cambia con eso.
 *
 * Lo pidió el cliente el 25/09/2026, con estas palabras: *«Parámetro estancia
 * corta, estancia larga. Menos de 1 mes más limitantes. Más, ya son casi
 * residentes»*.
 *
 * Casi todo estaba: `permiso_vivienda` tiene desde el principio dos bloques de
 * reglas --`corta_*` y `larga_*`-- con sus visitas, niños, mascotas y
 * horarios. Lo que faltaba era **la frontera**: nada decía cuándo una estancia
 * es corta, así que los dos bloques estaban ahí sin que nada pudiera elegir
 * entre ellos, y `corta_permite_visitas` no lo leía nadie.
 *
 * Aquí se comprueban las tres cosas que importan de una regla así: que el
 * umbral separe, que se herede del edificio cuando la vivienda no diga nada, y
 * que sin decidir **no se prohíba** — que es la regla que ya rige en el resto
 * de `permiso_vivienda`.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test";

/** Lo que había antes de tocar nada, para devolverlo al terminar. */
let filaCondominio: Record<string, unknown> | null = null;
let filaUnidad: Record<string, unknown> | null = null;

async function leer(unidadId: string | null) {
  const consulta = supabase
    .from("permiso_vivienda")
    .select("id, corta_hasta_noches, corta_permite_visitas, larga_permite_visitas")
    .eq("condominio_id", CONDOMINIO);
  const { data } = await (unidadId
    ? consulta.eq("unidad_id", unidadId)
    : consulta.is("unidad_id", null));
  return data?.[0] ?? null;
}

async function escribir(id: string, valores: Record<string, unknown>) {
  const { error } = await supabase
    .from("permiso_vivienda")
    .update(valores)
    .eq("id", id);
  expect(error?.message ?? null).toBeNull();
}

const corta = async (noches: number) => {
  const { data } = await supabase.rpc("es_estancia_corta", {
    p_unidad_id: U102,
    p_noches: noches,
  });
  return data as boolean;
};

const admiteVisitas = async (noches: number) => {
  const { data } = await supabase.rpc("estancia_admite_visitas", {
    p_unidad_id: U102,
    p_noches: noches,
  });
  return data as boolean;
};

beforeAll(async () => {
  await entrarComo(ADMIN);
  filaCondominio = await leer(null);
  filaUnidad = await leer(U102);
  expect(filaCondominio).not.toBeNull();
  expect(filaUnidad).not.toBeNull();
});

afterAll(async () => {
  // Se devuelve exactamente lo que había: son filas del condominio de prueba
  // que usan otras pruebas, no filas que este recorrido creara.
  if (filaCondominio) {
    await escribir(filaCondominio.id as string, {
      corta_hasta_noches: filaCondominio.corta_hasta_noches,
      corta_permite_visitas: filaCondominio.corta_permite_visitas,
      larga_permite_visitas: filaCondominio.larga_permite_visitas,
    });
  }
  if (filaUnidad) {
    await escribir(filaUnidad.id as string, {
      corta_hasta_noches: filaUnidad.corta_hasta_noches,
      corta_permite_visitas: filaUnidad.corta_permite_visitas,
      larga_permite_visitas: filaUnidad.larga_permite_visitas,
    });
  }
  await salir();
});

describe("dónde acaba una estancia corta", () => {
  it("sin umbral decidido, todo es corta", async () => {
    /*
      Lo mas restrictivo, no lo mas permisivo: mientras nadie diga donde esta
      la frontera, una estancia cae del lado con mas limites. Al reves, un
      edificio que no ha configurado nada estaria dando a cualquier huesped de
      dos noches el trato de un residente.
    */
    await escribir(filaCondominio!.id as string, { corta_hasta_noches: null });
    await escribir(filaUnidad!.id as string, { corta_hasta_noches: null });

    expect(await corta(2)).toBe(true);
    expect(await corta(365)).toBe(true);
  });

  it("y con el umbral del edificio, separa por ahí", async () => {
    // «Menos de 1 mes más limitantes», que es como lo dijo el cliente.
    await escribir(filaCondominio!.id as string, { corta_hasta_noches: 30 });
    await escribir(filaUnidad!.id as string, { corta_hasta_noches: null });

    expect(await corta(30)).toBe(true);
    expect(await corta(31)).toBe(false);
  });

  it("y una vivienda puede tener el suyo propio", async () => {
    // La fila de la unidad manda sobre la del condominio, campo a campo, que
    // es como ya funciona el resto de `permisos_de_unidad`.
    await escribir(filaCondominio!.id as string, { corta_hasta_noches: 30 });
    await escribir(filaUnidad!.id as string, { corta_hasta_noches: 7 });

    expect(await corta(7)).toBe(true);
    expect(await corta(8)).toBe(false);
  });
});

describe("y qué cambia según el lado", () => {
  it("un huésped de paso puede quedarse sin visitas y uno largo tenerlas", async () => {
    /*
      Es el caso entero que pidio el cliente: «menos de 1 mes mas limitantes,
      mas, ya son casi residentes». Las dos banderas existian desde el
      principio y no las leia nadie.
    */
    await escribir(filaCondominio!.id as string, {
      corta_hasta_noches: 30,
      corta_permite_visitas: false,
      larga_permite_visitas: true,
    });
    await escribir(filaUnidad!.id as string, {
      corta_hasta_noches: null,
      corta_permite_visitas: null,
      larga_permite_visitas: null,
    });

    expect(await admiteVisitas(5)).toBe(false);
    expect(await admiteVisitas(60)).toBe(true);
  });

  it("y si nadie lo ha decidido, no se prohíbe", async () => {
    // La misma regla que rige en todo `permiso_vivienda`: un condominio que
    // no ha dicho nada no esta prohibiendo nada.
    await escribir(filaCondominio!.id as string, {
      corta_permite_visitas: null,
      larga_permite_visitas: null,
    });
    await escribir(filaUnidad!.id as string, {
      corta_permite_visitas: null,
      larga_permite_visitas: null,
    });

    expect(await admiteVisitas(5)).toBe(true);
    expect(await admiteVisitas(60)).toBe(true);
  });
});
