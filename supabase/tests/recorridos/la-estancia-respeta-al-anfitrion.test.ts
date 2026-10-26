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
 * Se trae su configuración: fija en la 102 un mínimo de 3 noches, un máximo de
 * 6 y 4 personas, y devuelve lo que había.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const MARCA = "[prueba] respeta al anfitrion";

let original: { estancia_minima_noches: number | null; estancia_maxima_noches: number | null; max_huespedes: number | null };
const creadas: string[] = [];

async function estancia(desde: number, hasta: number, extra: Record<string, unknown> = {}) {
  const r = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U102,
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
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("estancia_minima_noches, estancia_maxima_noches, max_huespedes")
    .eq("unidad_id", U102)
    .single();
  if (error) throw new Error(error.message);
  original = data;
  const { error: e2 } = await servicio
    .from("suscripcion_renta_corta")
    .update({ estancia_minima_noches: 3, estancia_maxima_noches: 6, max_huespedes: 4 })
    .eq("unidad_id", U102);
  if (e2) throw new Error(e2.message);
});

afterAll(async () => {
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA);
  const { error } = await servicio.from("suscripcion_renta_corta").update(original).eq("unidad_id", U102);
  if (error) throw new Error(`No se pudo devolver la 102: ${error.message}`);
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
