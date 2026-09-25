import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: qué pasa con las viviendas cuando se borra su torre.
 *
 * Salió recorriendo Arquitectura como Marcela. El alta, el menú y el borrado
 * funcionan, y el borrado es **lógico** --marca `deleted_at`, no borra la
 * fila--, que es lo correcto.
 *
 * Lo que no hay es nada que mire si la torre está vacía. `eliminarTorre` hace
 * un `update` de una sola columna, no hay disparador en `torre`, y la lista de
 * unidades filtra por el `deleted_at` de la **unidad**, no por el de su torre.
 *
 * Esta prueba existe para dejar dicho qué pasa de verdad, en vez de suponerlo:
 * se crea una torre marcada, se le cuelga una vivienda, se borra la torre, y
 * se mira qué queda.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const MARCA = "[prueba] torre con vivienda";

let torreId = "";
let unidadId = "";

beforeAll(async () => {
  await entrarComo(ADMIN);

  const { data: torre, error: errorTorre } = await supabase
    .from("torre")
    .insert({ condominio_id: CONDOMINIO, numero: 91, nombre: MARCA })
    .select("id")
    .single();
  expect(errorTorre?.message ?? null).toBeNull();
  torreId = torre!.id;

  const { data: unidad, error: errorUnidad } = await supabase
    .from("unidad")
    .insert({
      condominio_id: CONDOMINIO,
      torre_id: torreId,
      codigo: "9101",
      piso: 1,
    })
    .select("id")
    .single();
  expect(errorUnidad?.message ?? null).toBeNull();
  unidadId = unidad!.id;
});

afterAll(async () => {
  // Con la escoba: son filas que este recorrido creó y que el borrado de la
  // aplicación solo marca, así que un `delete` de persona las dejaría ahí.
  await servicio.from("unidad").delete().eq("id", unidadId);
  await servicio.from("torre").delete().eq("id", torreId);
  await salir();
});

describe("borrar una torre que tiene viviendas", () => {
  it("la base lo permite, sin avisar de nada", async () => {
    /*
      Se comprueba que PASA, no que deba pasar. Si algún día se decide
      impedirlo --o arrastrar las viviendas-- este caso se pone rojo y hay que
      venir a cambiarlo, que es justo lo que se quiere: que la decisión no se
      pierda.
    */
    const { error } = await supabase
      .from("torre")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", torreId);

    expect(error).toBeNull();
  });

  it("y la vivienda se queda activa, colgando de una torre que ya no se ve", async () => {
    const { data: torre } = await supabase
      .from("torre")
      .select("deleted_at")
      .eq("id", torreId)
      .single();
    const { data: unidad } = await supabase
      .from("unidad")
      .select("codigo, torre_id, deleted_at")
      .eq("id", unidadId)
      .single();

    expect(torre!.deleted_at).not.toBeNull();
    // Sigue viva y sigue apuntando a la torre borrada.
    expect(unidad!.deleted_at).toBeNull();
    expect(unidad!.torre_id).toBe(torreId);
  });

  it("y desaparece de la pantalla de arquitectura, que filtra por torre viva", async () => {
    /*
      Esta es la consecuencia que se ve: la pantalla pide las torres no
      borradas y cuenta las viviendas de cada una, así que una vivienda cuya
      torre ya no está deja de aparecer en ningún sitio. No está borrada:
      está escondida.
    */
    const { data: torresVivas } = await supabase
      .from("torre")
      .select("id")
      .is("deleted_at", null);

    const ids = (torresVivas ?? []).map((t) => t.id);
    expect(ids).not.toContain(torreId);

    const { data: unidades } = await supabase
      .from("unidad")
      .select("id, torre_id")
      .is("deleted_at", null);

    const huerfanas = (unidades ?? []).filter(
      (u) => u.torre_id !== null && !ids.includes(u.torre_id),
    );
    expect(huerfanas.map((u) => u.id)).toContain(unidadId);
  });
});
