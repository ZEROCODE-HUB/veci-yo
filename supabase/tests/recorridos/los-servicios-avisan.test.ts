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
const MARCA = "[prueba] aviso de servicio";

let sofiaId = "";
let hoyDia = 0;
let paraHoy = "";
let paraOtroDia = "";

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
      { unidad_id: U102, nombre: `${MARCA} hoy`, empresa: "Empresa de prueba", dia_primer_aviso: hoyDia },
      { unidad_id: U102, nombre: `${MARCA} otro día`, dia_primer_aviso: otroDia, dia_segundo_aviso: otroDia },
    ])
    .select("id, nombre");
  if (error) throw new Error(error.message);
  paraHoy = creados!.find((s) => s.nombre.endsWith("hoy"))!.id;
  paraOtroDia = creados!.find((s) => s.nombre.endsWith("otro día"))!.id;
});

afterAll(async () => {
  await limpiar();
});

describe("el aviso de pago de un servicio", () => {
  it("sale el día elegido, al propietario, una sola vez aunque la tarea corra dos", async () => {
    await servicio.rpc("avisar_servicios_de_vivienda");
    await servicio.rpc("avisar_servicios_de_vivienda");
    const avisos = await avisosDe(paraHoy);
    expect(avisos.filter((a) => a.usuario_id === sofiaId)).toHaveLength(1);
    expect(avisos[0].titulo).toMatch(/Recuerda pagar/);
    expect(avisos[0].mensaje).toMatch(/Empresa de prueba/);
  });

  it("y no sale otro día", async () => {
    expect(await avisosDe(paraOtroDia)).toHaveLength(0);
  });
});
