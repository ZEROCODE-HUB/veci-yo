import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  colgarLlamada,
  contestarLlamada,
  llamadasQueMeSuenan,
  llamarAPorteria,
  llamarAVivienda,
  permisoDeVoz,
} from "@/features/intercom/services/intercom.repo";

/**
 * Recorrido: el intercomunicador (14/10/2026).
 *
 * Una vivienda llama a la portería por internet y la portería contesta; la
 * portería llama a una vivienda. La portería solo puede si la administración
 * le habilitó las llamadas (KT). La voz va por LiveKit, en el servidor propio
 * (15/10/2026): el permiso de voz que se da lo acepta ese servidor de verdad.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test"; // Sofía, 102
const GUARDIA = "guardia@veciyo.test";
const AJENO = "vecino2@veciyo.test"; // Bruno, otro edificio

let sofiaId = "";
let guardiaId = "";
let permisosCrudos: unknown = null;
const llamadas: string[] = [];

async function permitirLlamadas(si: boolean) {
  await servicio
    .from("membresia_condominio")
    .update({ permisos: { ...(permisosCrudos as object), llamadas: si } })
    .eq("usuario_id", guardiaId)
    .eq("rol", "guardia");
}

beforeAll(async () => {
  sofiaId = await entrarComo(VECINA);
  await salir();
  guardiaId = await entrarComo(GUARDIA);
  await salir();
  const { data } = await servicio
    .from("membresia_condominio")
    .select("permisos")
    .eq("usuario_id", guardiaId)
    .eq("rol", "guardia")
    .single();
  permisosCrudos = data!.permisos;
});

afterAll(async () => {
  await servicio
    .from("membresia_condominio")
    .update({ permisos: permisosCrudos })
    .eq("usuario_id", guardiaId)
    .eq("rol", "guardia");
  if (llamadas.length > 0) {
    const { error } = await servicio.from("llamada_internet").delete().in("id", llamadas);
    expect(error).toBeNull();
  }
});

describe("la vivienda llama a la portería", () => {
  let id = "";

  it("sin permiso de llamadas, a la portería no le suena", async () => {
    await permitirLlamadas(false);
    await entrarComo(VECINA);
    id = await llamarAPorteria(U102);
    llamadas.push(id);
    await salir();

    await entrarComo(GUARDIA);
    const suenan = await llamadasQueMeSuenan(guardiaId);
    await expect(contestarLlamada(id)).rejects.toThrow(/no es para ti/i);
    await salir();
    expect(suenan.find((l) => l.id === id)).toBeUndefined();
  });

  it("con permiso, le suena y contesta", async () => {
    await permitirLlamadas(true);
    await entrarComo(GUARDIA);
    const suenan = await llamadasQueMeSuenan(guardiaId);
    expect(suenan.find((l) => l.id === id)?.deUnidad).toBe("102");
    await contestarLlamada(id);
    await salir();

    const { data } = await servicio.from("llamada_internet").select("estado, contestada_por").eq("id", id).single();
    expect(data).toEqual({ estado: "en_curso", contestada_por: guardiaId });
  });

  it("alguien de otro edificio ni la ve", async () => {
    await entrarComo(AJENO);
    const { data } = await supabase.from("llamada_internet").select("id").eq("id", id);
    await salir();
    expect(data).toEqual([]);
  });

  it("quien está en la llamada recibe un permiso que el servidor de voz acepta", async () => {
    await entrarComo(VECINA);
    const { servidor, token } = await permisoDeVoz(id);
    await salir();
    expect(servidor).toMatch(/^wss:\/\//);
    const r = await fetch(`${servidor.replace(/^wss/, "https")}/rtc/validate?access_token=${token}`);
    expect(r.status).toBe(200);
    // Un permiso inventado no entra: la prueba sí distingue.
    const falso = await fetch(`${servidor.replace(/^wss/, "https")}/rtc/validate?access_token=x${token}`);
    expect(falso.status).not.toBe(200);
  });

  it("alguien que no está en la llamada no recibe permiso de voz", async () => {
    await entrarComo(AJENO);
    await expect(permisoDeVoz(id)).rejects.toThrow(/no es tuya/i);
    await salir();
  });

  it("al colgar, termina", async () => {
    await entrarComo(VECINA);
    await colgarLlamada(id);
    await salir();
    const { data } = await servicio.from("llamada_internet").select("estado").eq("id", id).single();
    expect(data!.estado).toBe("terminada");
  });
});

describe("la portería llama a una vivienda", () => {
  it("sin permiso, no puede", async () => {
    await permitirLlamadas(false);
    await entrarComo(GUARDIA);
    await expect(llamarAVivienda(U102)).rejects.toThrow(/no te habilito las llamadas/i);
    await salir();
  });

  it("con permiso, le suena a la vivienda; si nadie contesta, queda perdida", async () => {
    await permitirLlamadas(true);
    await entrarComo(GUARDIA);
    const id = await llamarAVivienda(U102);
    llamadas.push(id);
    await salir();

    await entrarComo(VECINA);
    const suenan = await llamadasQueMeSuenan(sofiaId);
    await salir();
    expect(suenan.find((l) => l.id === id)?.destino).toBe("vivienda");

    await entrarComo(GUARDIA);
    await colgarLlamada(id);
    await salir();
    const { data } = await servicio.from("llamada_internet").select("estado").eq("id", id).single();
    expect(data!.estado).toBe("perdida");
  });
});
