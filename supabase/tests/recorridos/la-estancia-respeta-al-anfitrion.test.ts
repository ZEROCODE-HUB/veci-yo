import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isoEnDias, servicio, ventanaDe } from "./cliente";

/** Sus fechas, lejos de las de los demás: ver `ventanaDe`. */
const V = ventanaDe("la-estancia-respeta-al-anfitrion");

/**
 * Recorrido: una estancia respeta las noches y la capacidad que fijó el
 * anfitrión (huecos 10 y 28, 21/10/2026).
 *
 * La pantalla de nueva reserva ya lo hacía; «Editar la reserva» no, y la base
 * tampoco. Ahora lo comprueba la base (`estancia_respeta_al_anfitrion`),
 * así que da igual por dónde llegue. Las del calendario de Airbnb/Booking
 * quedan fuera: esas las decidió la plataforma.
 *
 * Se trae su vivienda: crea una de usar y tirar en la torre de la 102, con la
 * renta corta activa (mínimo 3 noches, máximo 6, 4 personas), y la retira al
 * terminar. En la 102 no se puede: la comparten en paralelo pruebas que abren
 * estancias de una noche (ver `noches-del-anfitrion.ts`).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const TORRE_DE_LA_102 = "22222222-2222-2222-2222-222222222221";
let unidad = "";
const MARCA = "[prueba] respeta al anfitrion";

const creadas: string[] = [];

async function estancia(desde: number, hasta: number, extra: Record<string, unknown> = {}) {
  const r = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: unidad,
      tipo: "huesped_temporal",
      fecha_desde: isoEnDias(V + desde),
      fecha_hasta: isoEnDias(V + hasta),
      anotaciones_ingreso: MARCA,
      ...extra,
    })
    .select("id")
    .single();
  if (r.data) creadas.push(r.data.id);
  return r;
}

beforeAll(async () => {
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA);
  await servicio.from("unidad").delete().eq("codigo", "PRUEBA-NOCHES");
  const { data: u, error } = await servicio
    .from("unidad")
    .insert({ condominio_id: CONDOMINIO, torre_id: TORRE_DE_LA_102, codigo: "PRUEBA-NOCHES", piso: 9 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  unidad = u.id;
  const { error: e2 } = await servicio.from("suscripcion_renta_corta").insert({
    unidad_id: unidad,
    estado: "activa",
    estancia_minima_noches: 3,
    estancia_maxima_noches: 6,
    max_huespedes: 4,
  });
  if (e2) throw new Error(e2.message);
});

afterAll(async () => {
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA);
  await servicio.from("suscripcion_renta_corta").delete().eq("unidad_id", unidad);
  const { error } = await servicio.from("unidad").delete().eq("id", unidad);
  if (error) throw new Error(`No se pudo retirar la vivienda de prueba: ${error.message}`);
});

describe("las noches del anfitrión", () => {
  it("menos de las mínimas, no; y dice por qué", async () => {
    const r = await estancia(0, 2);
    expect(r.error?.message).toMatch(/al menos 3 noches/);
  });

  it("más de las máximas, tampoco", async () => {
    const r = await estancia(0, 7);
    expect(r.error?.message).toMatch(/hasta 6 noches/);
  });

  it("dentro del tramo, sí (control)", async () => {
    const r = await estancia(0, 3);
    expect(r.error).toBeNull();
  });

  it("al editar las fechas también se comprueba", async () => {
    const id = creadas[creadas.length - 1];
    const r = await servicio.from("visita").update({ fecha_hasta: isoEnDias(V + 1) }).eq("id", id);
    expect(r.error?.message).toMatch(/al menos 3 noches/);
  });

  it("lo que trae el calendario de Airbnb o Booking no se toca", async () => {
    const r = await estancia(10, 11, { origen: "calendario", plataforma: "airbnb" });
    expect(r.error).toBeNull();
  });
});

describe("la configuración del anfitrión", () => {
  it("el máximo de noches no puede quedar por debajo del mínimo", async () => {
    const r = await servicio
      .from("suscripcion_renta_corta")
      .update({ estancia_maxima_noches: 2 })
      .eq("unidad_id", unidad);
    expect(r.error?.code).toBe("23514");
  });
});

describe("la capacidad del anfitrión", () => {
  it("más personas de las que caben, no", async () => {
    const r = await estancia(20, 24, { huespedes_previstos: 5 });
    expect(r.error?.message).toMatch(/caben 4 personas/);
  });

  it("las que caben, sí (control)", async () => {
    const r = await estancia(20, 24, { huespedes_previstos: 4 });
    expect(r.error).toBeNull();
  });
});
