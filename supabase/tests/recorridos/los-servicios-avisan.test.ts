import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { servicio } from "./cliente";

/**
 * Recorrido: los servicios de la vivienda avisan el día que se eligió.
 *
 * Parametrización (25/10/2026): «Primer aviso» y «Segundo aviso» se guardaban
 * y nada los mandaba. Ahora `avisar_servicios_de_vivienda` --la corre una
 * tarea diaria-- avisa en la campana del propietario el día del mes elegido,
 * con el día del edificio.
 *
 * Los casos se escriben con la clave de servicio a propósito: la función es
 * interna (solo la llama la tarea) y lo que se mide es a quién le llega el
 * aviso, no quién puede escribir el servicio (eso lo mide
 * `los-servicios-de-la-vivienda`).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const U205 = "44444444-4444-4444-4444-444444444442";
const MARCA = "[prueba] aviso de servicio";

let sofiaId = "";
let hoyDia = 0;
let paraHoy = "";
let paraOtroDia = "";
let para102 = "";
const quien: Record<string, string> = {};

async function avisosDe(entidad: string) {
  const { data, error } = await servicio
    .from("notificacion")
    .select("usuario_id, titulo, mensaje")
    .eq("entidad_id", entidad)
    .eq("tipo", "servicio_por_pagar");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function limpiar() {
  const { data } = await servicio.from("servicio_de_vivienda").select("id").like("nombre", `${MARCA}%`);
  const ids = (data ?? []).map((s: { id: string }) => s.id);
  if (ids.length) {
    await servicio.from("notificacion").delete().in("entidad_id", ids);
    const { error } = await servicio.from("servicio_de_vivienda").delete().in("id", ids);
    if (error) throw new Error(`No se pudieron retirar los servicios: ${error.message}`);
  }
}

beforeAll(async () => {
  await limpiar();
  const { data: perfil, error: errorPerfil } = await servicio
    .from("membresia_unidad")
    .select("usuario_id")
    .eq("unidad_id", U102)
    .eq("rol", "propietario")
    .eq("activo", true)
    .limit(1)
    .single();
  if (errorPerfil) throw new Error(errorPerfil.message);
  sofiaId = perfil.usuario_id;

  // Quién es quién en la 102 y la 205, por su papel (hueco 12).
  const { data: gente, error: errorGente } = await servicio
    .from("membresia_unidad")
    .select("usuario_id, unidad_id, rol, es_residente")
    .in("unidad_id", [U102, U205])
    .eq("activo", true);
  if (errorGente) throw new Error(errorGente.message);
  for (const g of gente ?? []) quien[`${g.unidad_id === U102 ? "102" : "205"}:${g.rol}`] = g.usuario_id;

  // El día del edificio, que es con el que cuenta la función.
  const { data: hoy, error: errorHoy } = await servicio.rpc("hoy_en_el_edificio", {
    p_condominio_id: CONDOMINIO,
  });
  if (errorHoy) throw new Error(errorHoy.message);
  hoyDia = Number(String(hoy).slice(8, 10));
  const otroDia = hoyDia === 15 ? 16 : 15;

  const { data: creados, error } = await servicio
    .from("servicio_de_vivienda")
    .insert([
      /*
        Desde el 11/11/2026 el que se paga hoy es de la 205, donde viven
        Guillermo (propietario), Laura (inquilina líder) y Rocío (residente).
        La 102 se alquila por noches desde el 29/10: Sofía no vive ahí y solo
        hay huéspedes, así que su servicio no le avisa a nadie.
      */
      { unidad_id: U205, nombre: `${MARCA} hoy`, empresa: "Empresa de prueba", dia_primer_aviso: hoyDia },
      { unidad_id: U205, nombre: `${MARCA} otro día`, dia_primer_aviso: otroDia, dia_segundo_aviso: otroDia },
      { unidad_id: U102, nombre: `${MARCA} 102`, dia_primer_aviso: hoyDia },
    ])
    .select("id, nombre");
  if (error) throw new Error(error.message);
  paraHoy = creados!.find((s) => s.nombre.endsWith("hoy"))!.id;
  paraOtroDia = creados!.find((s) => s.nombre.endsWith("otro día"))!.id;
  para102 = creados!.find((s) => s.nombre.endsWith("102"))!.id;
});

afterAll(async () => {
  await limpiar();
});

describe("el aviso de pago de un servicio", () => {
  it("sale el día elegido, al propietario que vive ahí, una sola vez aunque la tarea corra dos", async () => {
    await servicio.rpc("avisar_servicios_de_vivienda");
    await servicio.rpc("avisar_servicios_de_vivienda");
    const avisos = await avisosDe(paraHoy);
    expect(avisos.filter((a) => a.usuario_id === quien["205:propietario"])).toHaveLength(1);
    expect(avisos[0].titulo).toMatch(/Recuerda pagar/);
    expect(avisos[0].mensaje).toMatch(/Empresa de prueba/);
  });

  it("y no sale otro día", async () => {
    expect(await avisosDe(paraOtroDia)).toHaveLength(0);
  });

  /*
    Hueco 12 (21/10/2026): le llega a quien vive en la vivienda, no al
    anfitrión ni al huésped. El 09/11/2026 el propietario que no vive empezó a
    recibir los avisos de paquetes y reservas (Correcciones, fila 10), pero no
    los de servicios: esos siguen siendo de quien vive.
  */
  it("le llega a quien vive: la inquilina líder y la residente sí", async () => {
    const avisos = await avisosDe(paraHoy);
    const a = new Set(avisos.map((x) => x.usuario_id));
    expect(a.has(quien["205:inquilino_lider"])).toBe(true);
    expect(a.has(quien["205:residente"])).toBe(true);
  });

  it("y no a la dueña que no vive en ella ni al huésped", async () => {
    const avisos = await avisosDe(para102);
    const a = new Set(avisos.map((x) => x.usuario_id));
    expect(a.has(quien["102:propietario"])).toBe(false);
    expect(a.has(quien["102:huesped_temporal"])).toBe(false);
    // El control: el aviso de la 205 sí salió, así que la tarea corrió.
    expect((await avisosDe(paraHoy)).length).toBeGreaterThan(0);
  });
});
