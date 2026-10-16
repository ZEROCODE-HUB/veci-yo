import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  contestarLlamada,
  llamadasQueMeSuenan,
  llamarAPorteria,
} from "@/features/intercom/services/intercom.repo";

/**
 * Recorrido: la llamada a portería siempre tiene quien conteste (15/10/2026,
 * hueco 16).
 *
 * Sofía llama a portería desde la 102. Con un guardia con permiso de
 * llamadas, le suena a él y no a la administración. Sin ninguno, le suena a la
 * administración, que la puede contestar. Y la que nadie contesta en un
 * minuto queda perdida y avisa.
 *
 * Los permisos de los guardias se guardan crudos y se devuelven tal cual.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test";
const JUAN = "guardia@veciyo.test";
const MARCELA = "admin@veciyo.test";

const ids: Record<string, string> = {};
const llamadas: string[] = [];
let guardiasAntes: { id: string; permisos: unknown }[] = [];

const ponerLlamadas = async (valor: boolean) => {
  for (const g of guardiasAntes) {
    const { error } = await servicio
      .from("membresia_condominio")
      .update({ permisos: { ...((g.permisos as object) ?? {}), llamadas: valor } })
      .eq("id", g.id);
    if (error) throw new Error(error.message);
  }
};

const llamar = async () => {
  await entrarComo(SOFIA);
  const id = await llamarAPorteria(U102);
  await salir();
  llamadas.push(id);
  return id;
};

const leSuena = async (correo: string, llamada: string) => {
  await entrarComo(correo);
  const lista = await llamadasQueMeSuenan(ids[correo]);
  await salir();
  return lista.some((l) => l.id === llamada);
};

beforeAll(async () => {
  for (const correo of [SOFIA, JUAN, MARCELA]) {
    ids[correo] = await entrarComo(correo);
    await salir();
  }
  const { data, error } = await servicio
    .from("membresia_condominio")
    .select("id, permisos")
    .eq("condominio_id", CONDOMINIO)
    .eq("rol", "guardia");
  if (error) throw new Error(error.message);
  guardiasAntes = data ?? [];
});

afterAll(async () => {
  await salir();
  for (const g of guardiasAntes) {
    await servicio.from("membresia_condominio").update({ permisos: g.permisos }).eq("id", g.id);
  }
  if (llamadas.length) {
    await servicio.from("notificacion").delete().in("entidad_id", llamadas);
    const { error } = await servicio.from("llamada_internet").delete().in("id", llamadas);
    if (error) throw new Error(error.message);
  }
});

describe("una llamada a portería", () => {
  it("con un guardia con permiso, le suena a él y no a la administración", async () => {
    await ponerLlamadas(true);
    const id = await llamar();
    expect(await leSuena(JUAN, id)).toBe(true);
    expect(await leSuena(MARCELA, id)).toBe(false);
  });

  it("sin ningún guardia con permiso, le suena a la administración, que la contesta", async () => {
    await ponerLlamadas(false);
    const id = await llamar();
    expect(await leSuena(JUAN, id)).toBe(false);
    expect(await leSuena(MARCELA, id)).toBe(true);

    await entrarComo(MARCELA);
    await contestarLlamada(id);
    await salir();
    const { data } = await servicio.from("llamada_internet").select("estado, contestada_por").eq("id", id).single();
    expect(data).toEqual({ estado: "en_curso", contestada_por: ids[MARCELA] });
  });

  it("la que nadie contesta en un minuto queda perdida y avisa a quien la tenía que contestar", async () => {
    const id = await llamar();
    // Se le echa encima el minuto, y se corre la pasada que hace el cron.
    await servicio
      .from("llamada_internet")
      .update({ created_at: new Date(Date.now() - 2 * 60_000).toISOString() })
      .eq("id", id);
    const { error } = await servicio.rpc("llamadas_sin_contestar");
    expect(error).toBeNull();

    const { data: llamada } = await servicio.from("llamada_internet").select("estado").eq("id", id).single();
    expect(llamada!.estado).toBe("perdida");

    const { data: avisos } = await servicio
      .from("notificacion")
      .select("usuario_id, mensaje")
      .eq("entidad_id", id)
      .eq("tipo", "llamada_perdida");
    const marcela = avisos?.find((a) => a.usuario_id === ids[MARCELA]);
    expect(marcela?.mensaje).toContain("102");
    // A quien llamó, no.
    expect(avisos?.some((a) => a.usuario_id === ids[SOFIA])).toBe(false);
  });
});
