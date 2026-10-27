import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  enDias,
  entrarComo,
  retirarEstancia,
  salir,
  servicio,
  supabase,
  ventanaDe,
} from "./cliente";
import {
  crearVisita,
  marcarLlegadaInvitado,
  registrarHoraInvitado,
} from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("una-salida-registrada-no-se-deshace");

/**
 * Recorrido: una salida registrada no se deshace (27/10/2026, hueco 31).
 *
 * La portería apagaba el interruptor de la salida y la visita volvía a
 * `ingresada` con el estacionamiento ya soltado. El cliente decidió que esa
 * opción no exista. Lo sujeta `una_salida_registrada_no_se_deshace`; el caso
 * negativo está en `guardia-registra-entrada-salida`, y aquí van sus
 * controles: lo que **sí** se tiene que poder seguir haciendo.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test";
const GUARDIA = "guardia@veciyo.test";
const ADMINISTRACION = "admin@veciyo.test";
const MARCA = "[prueba] salida que no se deshace";

const creadas: string[] = [];

async function visitaDeHoy(): Promise<{ visita: string; invitado: string }> {
  await entrarComo(VECINA);
  const visita = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    fechaDesde: enDias(0),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} amigo` }],
  });
  await salir();
  creadas.push(visita);
  const { data } = await servicio.from("invitado").select("id").eq("visita_id", visita).single();
  return { visita, invitado: data!.id };
}

async function invitado(id: string) {
  const { data } = await servicio
    .from("invitado")
    .select("llego, salida_en")
    .eq("id", id)
    .single();
  return data!;
}

beforeAll(async () => {
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) await retirarEstancia(v.id);
});

afterAll(async () => {
  await salir();
  for (const id of creadas) {
    const { error } = await retirarEstancia(id);
    if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
  }
});

describe("lo que la portería sigue pudiendo hacer", () => {
  it("desmarcar una llegada apuntada por error, antes de la salida", async () => {
    const { invitado: id } = await visitaDeHoy();
    await entrarComo(GUARDIA);
    await marcarLlegadaInvitado(id, true);
    await marcarLlegadaInvitado(id, false);
    await salir();
    expect((await invitado(id)).llego).toBe(false);
  });

  it("corregir la hora de una salida ya registrada", async () => {
    const { invitado: id } = await visitaDeHoy();
    await entrarComo(GUARDIA);
    await marcarLlegadaInvitado(id, true);
    await registrarHoraInvitado(id, "salida", "18:00");
    await registrarHoraInvitado(id, "salida", "18:30");
    await salir();
    const salida = (await invitado(id)).salida_en;
    expect(salida).not.toBeNull();
    expect(new Date(salida!).getMinutes()).toBe(30);
  });

  it("y en una estancia de huésped, salir y volver a entrar", async () => {
    await entrarComo(VECINA);
    const visita = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U102,
      tipo: "huesped_temporal",
      fechaDesde: enDias(V + 1),
      fechaHasta: enDias(V + 3),
      anotacionesIngreso: MARCA,
      invitados: [{ nombre: `${MARCA} titular`, documentoNumero: "93009992", tipoDocumento: "cedula_ciudadania" }],
    });
    await salir();
    creadas.push(visita);
    const { data } = await servicio.from("invitado").select("id").eq("visita_id", visita).single();
    const id = data!.id;
    // Dentro y fuera, puesto directo: el asunto es volver a entrar.
    const ahora = new Date().toISOString();
    const { error: preparar } = await servicio
      .from("invitado")
      .update({ llego: true, ingreso_en: ahora, salida_en: ahora })
      .eq("id", id);
    expect(preparar).toBeNull();

    await entrarComo(ADMINISTRACION);
    const { error } = await supabase.from("invitado").update({ salida_en: null }).eq("id", id);
    await salir();
    expect(error).toBeNull();
    expect((await invitado(id)).salida_en).toBeNull();
  });

  it("control: en una visita corriente, la administración tampoco la deshace", async () => {
    const { invitado: id } = await visitaDeHoy();
    await entrarComo(GUARDIA);
    await marcarLlegadaInvitado(id, true);
    await registrarHoraInvitado(id, "salida", "18:00");
    await salir();
    await entrarComo(ADMINISTRACION);
    const { error } = await supabase.from("invitado").update({ salida_en: null }).eq("id", id);
    await salir();
    expect(error?.message ?? "").toMatch(/no se deshace/);
    expect((await invitado(id)).salida_en).not.toBeNull();
  });
});
