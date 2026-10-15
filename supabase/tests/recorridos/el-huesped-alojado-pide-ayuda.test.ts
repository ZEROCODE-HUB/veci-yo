import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { activarSos } from "@/features/perfil/services/sos.repo";
import {
  colgarLlamada,
  llamarAPorteria,
  llamarAVivienda,
  obtenerLlamada,
} from "@/features/intercom/services/intercom.repo";

/**
 * Recorrido: el huésped alojado pide ayuda y llama a la portería (15/10/2026).
 *
 * Al huésped con cuenta le salían el S.O.S. y el intercomunicador, y la base
 * se los negaba a los dos: las reglas pedían «ser vecino», que excluye al
 * huésped a propósito. Ahora puede el que está **dentro de sus fechas**; el que
 * todavía no llega y el que ya se fue, no.
 *
 * El cliente: la portería llama al huésped solo si tiene la app (GSheet,
 * 15/10/2026). Por eso la prueba usa huéspedes con cuenta.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ALOJADO = "nuevo.inquilino@veciyo.test"; // Tomás, dentro hasta 2030
const FUTURA = "huesped.futuro@veciyo.test"; // Nadia, todavía no llega
const PASADO = "huesped.pasado@veciyo.test"; // Ramiro, se fue en agosto
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, 102
const GUARDIA = "guardia@veciyo.test"; // Juan

const alarmas: string[] = [];
const llamadas: string[] = [];
let guardiaMembresia = "";
let permisosAntes: unknown = null;

beforeAll(async () => {
  const guardiaId = await entrarComo(GUARDIA);
  await salir();
  const { data } = await servicio
    .from("membresia_condominio")
    .select("id, permisos")
    .eq("condominio_id", CONDOMINIO)
    .eq("usuario_id", guardiaId)
    .eq("rol", "guardia")
    .limit(1)
    .single();
  guardiaMembresia = data!.id;
  permisosAntes = data!.permisos;
  // La portería necesita el permiso de llamadas para llamar a la vivienda.
  await servicio
    .from("membresia_condominio")
    .update({ permisos: { ...(data!.permisos as object), llamadas: true } })
    .eq("id", guardiaMembresia);
});

afterAll(async () => {
  await salir();
  await servicio.from("membresia_condominio").update({ permisos: permisosAntes }).eq("id", guardiaMembresia);
  if (alarmas.length) {
    await servicio.from("notificacion").delete().in("entidad_id", alarmas);
    const { error } = await servicio.from("alarma_sos").delete().in("id", alarmas);
    if (error) throw error;
  }
  if (llamadas.length) {
    const { error } = await servicio.from("llamada_internet").delete().in("id", llamadas);
    if (error) throw error;
  }
});

describe("el S.O.S.", () => {
  it("lo activa el huésped que está dentro", async () => {
    await entrarComo(ALOJADO);
    const alarma = await activarSos({ condominioId: CONDOMINIO, unidadId: U102 });
    await salir();
    alarmas.push(alarma.id);
    expect(alarma.id).toBeTruthy();
  });

  it("y se entera la anfitriona", async () => {
    const sofiaId = await entrarComo(ANFITRIONA);
    await salir();
    const { data } = await servicio
      .from("notificacion")
      .select("mensaje")
      .eq("entidad_id", alarmas[0])
      .eq("usuario_id", sofiaId);
    expect(data).toHaveLength(1);
    expect(data![0].mensaje).toMatch(/huésped/);
  });

  it("no lo activa quien todavía no llega", async () => {
    await entrarComo(FUTURA);
    await expect(activarSos({ condominioId: CONDOMINIO, unidadId: U102 })).rejects.toThrow(
      /row-level security/,
    );
    await salir();
  });

  it("ni quien ya se fue", async () => {
    await entrarComo(PASADO);
    await expect(activarSos({ condominioId: CONDOMINIO, unidadId: U102 })).rejects.toThrow(
      /row-level security/,
    );
    await salir();
  });
});

describe("el intercomunicador", () => {
  it("el huésped que está dentro llama a la portería", async () => {
    await entrarComo(ALOJADO);
    const id = await llamarAPorteria(U102);
    llamadas.push(id);
    await colgarLlamada(id);
    await salir();
    expect(id).toBeTruthy();
  });

  it("quien todavía no llega, no", async () => {
    await entrarComo(FUTURA);
    await expect(llamarAPorteria(U102)).rejects.toThrow(/vivienda tuya/);
    await salir();
  });

  it("cuando la portería llama a la vivienda, le suena al huésped que está dentro", async () => {
    await entrarComo(GUARDIA);
    const id = await llamarAVivienda(U102);
    await salir();
    llamadas.push(id);

    await entrarComo(ALOJADO);
    const vista = await obtenerLlamada(id);
    await salir();
    expect(vista?.id).toBe(id);
  });

  it("y no a la que todavía no llega", async () => {
    await entrarComo(FUTURA);
    const vista = await obtenerLlamada(llamadas[llamadas.length - 1]);
    await salir();
    expect(vista).toBeNull();
  });
});

describe("el teléfono de la portería", () => {
  it("lo ve el huésped que está dentro", async () => {
    await entrarComo(ALOJADO);
    const { data } = await supabase.from("porteria").select("id").eq("condominio_id", CONDOMINIO);
    await salir();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("y no quien ya se fue", async () => {
    await entrarComo(PASADO);
    const { data } = await supabase.from("porteria").select("id").eq("condominio_id", CONDOMINIO);
    await salir();
    expect(data ?? []).toEqual([]);
  });
});
