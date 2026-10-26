import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, isoEnDias, salir, servicio, ventanaDe } from "./cliente";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import { cambiarFechasDeEstancia } from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demás: ver `ventanaDe`. */
const V = ventanaDe("el-preregistro-cierra-antes-del-ingreso");

/**
 * Recorrido: el enlace del preregistro se cierra unas horas antes del ingreso
 * (hueco 23, 21/10/2026).
 *
 * El cliente: «debe ser ciertas horas antes del ingreso, parametrizable, y que
 * a pesar de la zona horaria funcione bien». Se mide con la hora del edificio
 * (Bogotá, UTC−5): la entrada de la 102 se fija a las 15:00 y el margen
 * (`preregistro_cierra_horas_antes_del_ingreso`) se lee de la base, así que el
 * enlace vence a las 15:00 − margen del día de llegada, hora de Bogotá.
 *
 * Se trae su configuración: la hora de entrada de la 102 y la devuelve.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] cierra antes del ingreso";

let visitaId = "";
let margen = 0;
let original: { checkin_desde: string | null; checkin_24h: boolean | null };

/** Las 15:00 de ese día en Bogotá, menos el margen, como instante. */
function cierreEsperado(fechaIso: string): number {
  const [y, m, d] = fechaIso.split("-").map(Number);
  // Bogotá no cambia de hora: siempre UTC−5.
  return Date.UTC(y, m - 1, d, 15 + 5 - margen, 0, 0);
}

async function venceEn(): Promise<number> {
  const { data, error } = await servicio
    .from("visita")
    .select("precheckin_expira_en")
    .eq("id", visitaId)
    .single();
  if (error) throw new Error(error.message);
  return new Date(data.precheckin_expira_en).getTime();
}

beforeAll(async () => {
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA);
  const { data: p } = await servicio
    .from("configuracion_plataforma")
    .select("valor")
    .eq("clave", "preregistro_cierra_horas_antes_del_ingreso")
    .single();
  margen = Number(p!.valor);

  const { data: s, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("checkin_desde, checkin_24h")
    .eq("unidad_id", U102)
    .single();
  if (error) throw new Error(error.message);
  original = s;
  await servicio
    .from("suscripcion_renta_corta")
    .update({ checkin_desde: "15:00", checkin_24h: false })
    .eq("unidad_id", U102);

  const { data: v, error: e2 } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U102,
      tipo: "huesped_temporal",
      fecha_desde: isoEnDias(V + 3),
      fecha_hasta: isoEnDias(V + 7),
      anotaciones_ingreso: MARCA,
    })
    .select("id")
    .single();
  if (e2) throw new Error(e2.message);
  visitaId = v.id;
  await servicio.from("invitado").insert({ visita_id: visitaId, orden: 1, nombre: `${MARCA} titular`, es_titular: true });
});

afterAll(async () => {
  await servicio.from("invitado").delete().eq("visita_id", visitaId);
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA);
  const { error } = await servicio.from("suscripcion_renta_corta").update(original).eq("unidad_id", U102);
  if (error) throw new Error(`No se pudo devolver la 102: ${error.message}`);
  await salir();
});

describe("cuándo vence el enlace", () => {
  it("unas horas antes de la entrada del día de llegada, con la hora del edificio", async () => {
    await entrarComo(ANFITRIONA);
    await abrirPrecheckin(visitaId);
    expect(await venceEn()).toBe(cierreEsperado(isoEnDias(V + 3)));
  });

  it("al cambiar las fechas, vence con las nuevas", async () => {
    await entrarComo(ANFITRIONA);
    await cambiarFechasDeEstancia({ visitaUuid: visitaId, desde: isoEnDias(V + 4), hasta: isoEnDias(V + 8) });
    expect(await venceEn()).toBe(cierreEsperado(isoEnDias(V + 4)));
  });

  it("terminado el preregistro, sigue sirviendo para ver el QR hasta el día siguiente a la salida", async () => {
    await servicio
      .from("visita")
      .update({ precheckin_completado_en: new Date().toISOString() })
      .eq("id", visitaId);
    const [y, m, d] = isoEnDias(V + 9).split("-").map(Number);
    // La medianoche del día siguiente a la salida, en Bogotá.
    expect(await venceEn()).toBe(Date.UTC(y, m - 1, d, 5, 0, 0));
  });
});
