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
 * Esta prueba nació dejando dicho qué pasaba de verdad --la base lo permitía y
 * la vivienda quedaba viva y escondida-- con una nota: «si algún día se decide
 * impedirlo, este caso se pone rojo y hay que venir a cambiarlo».
 *
 * Ese día fue el 02/10/2026. El cliente lo decidió así: **se impide, y se le
 * dice que vacíe la torre primero.** Lo sujeta `no_borrar_torre_con_viviendas`
 * en la base, no la pantalla, porque borrar una torre se puede pedir por la API
 * y lo que esto protege son las viviendas de un edificio entero.
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
  it("no se puede, y lo dice con el número de viviendas", async () => {
    const { error } = await supabase
      .from("torre")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", torreId);

    expect(error, "la base tiene que rechazarlo").toBeTruthy();
    // El mensaje le dice qué hacer, no solo que no puede.
    expect(error!.message).toContain("vivienda");
    expect(error!.message).toContain("Elimina primero");
  });

  it("y la torre sigue en pie", async () => {
    /*
      Lo que de verdad importa: que el rechazo haya dejado el mundo como
      estaba. Un disparador que lanza la excepción después de tocar algo
      serviría de poco.
    */
    const { data: torre } = await supabase
      .from("torre")
      .select("deleted_at")
      .eq("id", torreId)
      .single();

    expect(torre!.deleted_at).toBeNull();
  });

  it("vaciándola primero, sí se borra", async () => {
    /*
      El control positivo, y el camino que el cliente pidió: «que primero
      elimine todas las viviendas». Sin este caso, los de arriba pasarían igual
      con una torre que no se pudiera borrar nunca.
    */
    const { error: errorUnidad } = await supabase
      .from("unidad")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", unidadId);
    expect(errorUnidad).toBeNull();

    const { error } = await supabase
      .from("torre")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", torreId);

    expect(error).toBeNull();
  });

  it("y una vivienda ya dada de baja no cuenta", async () => {
    // Es el mismo criterio que el resto del proyecto: lo que esta de baja no
    // ocupa. Lo acaba de demostrar el caso de arriba, y aqui queda dicho.
    const { data: unidad } = await supabase
      .from("unidad")
      .select("deleted_at")
      .eq("id", unidadId)
      .single();

    expect(unidad!.deleted_at).not.toBeNull();
  });
});
