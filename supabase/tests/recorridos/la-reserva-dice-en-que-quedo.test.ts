import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { CLAVE, URL, entrarComo, salir, servicio, supabase, ventanaDe, enDias, isoEnDias } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("la-reserva-dice-en-que-quedo");

/**
 * Recorrido: el enlace dice en qué quedó la reserva (14/10/2026).
 *
 * La responsable de producto pidió que una reserva que ya terminó diga que
 * quedó completa, y una cancelada con el enlace vigente seguía abierta: el
 * huésped podía rellenar la ficha de una estancia que ya no existe.
 *
 * Se llama sin sesión, como lo hace la web: quien abre el enlace no tiene
 * cuenta.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] en que quedo";

const anonimo = createClient(URL, CLAVE, { auth: { persistSession: false } });

const visitas: string[] = [];

async function nueva(desde: number, hasta: number) {
  const id = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(desde),
    fechaHasta: enDias(hasta),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  visitas.push(id);
  const token = (await abrirPrecheckin(id)).enlace.split("/access/")[1];
  return { id, token };
}

async function estado(token: string) {
  const { data, error } = await anonimo.rpc("estado_de_la_reserva", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as { estado: string; dias_para_llegar: number }[])[0];
}

let proxima = { id: "", token: "" };
let cancelada = { id: "", token: "" };
let terminada = { id: "", token: "" };

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  proxima = await nueva(V + 1, V + 2);
  cancelada = await nueva(V + 4, V + 5);
  terminada = await nueva(V + 7, V + 8);
  await salir();
  // Una que ya pasó no se puede crear (`visita_no_en_el_pasado`): se mueve.
  const { error } = await servicio
    .from("visita")
    .update({ fecha_desde: isoEnDias(-3), fecha_hasta: isoEnDias(-2) })
    .eq("id", terminada.id);
  if (error) throw new Error(error.message);
});

afterAll(async () => {
  if (visitas.length > 0) {
    const { error } = await servicio.from("visita").delete().in("id", visitas);
    expect(error).toBeNull();
  }
});

describe("en qué quedó la reserva", () => {
  it("una por llegar dice cuántos días faltan", async () => {
    const r = await estado(proxima.token);
    expect(r.estado).toBe("proxima");
    expect(r.dias_para_llegar).toBeGreaterThan(0);
  });

  it("una que ya pasó dice que terminó", async () => {
    expect((await estado(terminada.token)).estado).toBe("terminada");
  });

  it("al cancelarla, lo dice, y el enlace deja de servir para escribir", async () => {
    await entrarComo(ANFITRIONA);
    const { error } = await supabase
      .from("visita")
      .update({ estado: "cancelada" })
      .eq("id", cancelada.id);
    await salir();
    expect(error).toBeNull();

    expect((await estado(cancelada.token)).estado).toBe("cancelada");
    const { error: alEscribir } = await anonimo.rpc("guardar_precheckin", {
      p_token: cancelada.token,
      p_nombre: "Alguien",
      p_documento: "123456",
      p_correo: "alguien@ejemplo.com",
    });
    expect(alEscribir?.message ?? "").toMatch(/no vale o ya vencio/i);
  });

  it("y la que sigue en pie, sí sirve", async () => {
    // El control: si cancelar cerrara todos los enlaces, el caso de arriba pasaria igual.
    const { error } = await anonimo.rpc("guardar_precheckin", {
      p_token: proxima.token,
      p_nombre: `${MARCA} titular`,
      p_documento: "123456",
      p_correo: "alguien@ejemplo.com",
    });
    expect(error).toBeNull();
  });
});
