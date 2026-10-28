import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  contestarLlamada,
  llamadasQueMeSuenan,
  llamarPorInternet,
  sePuedeLlamarPorLaApp,
} from "@/features/intercom/services/intercom.repo";

/**
 * Recorrido: la administración llama y recibe llamadas por la app, y cada uno
 * elige si quiere llamadas por la app (28/10/2026).
 *
 * Una vivienda llama a la administración; la administración, a una vivienda y
 * a la portería; la portería, a la administración. Y a quien apaga «Recibir
 * llamadas por la app» no le suena nada: si en el destino nadie las recibe, la
 * llamada por la app no se puede hacer (queda el teléfono).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test";
const JUAN = "guardia@veciyo.test";
const MARCELA = "admin@veciyo.test";
const AJENO = "vecino2@veciyo.test"; // Bruno, otro edificio

const ids: Record<string, string> = {};
const llamadas: string[] = [];
/** La administración entera del edificio: Marcela y quien coadministre. */
let administracion: { usuario_id: string }[] = [];
/** Cómo estaba `recibe_llamadas_app` de cada persona que se toca. */
const antes = new Map<string, boolean>();
let permisosDeJuan: unknown = null;

async function recibir(usuarioId: string, si: boolean) {
  const { error } = await servicio
    .from("perfil")
    .update({ recibe_llamadas_app: si })
    .eq("id", usuarioId);
  if (error) throw error;
}

async function leSuena(correo: string, llamada: string): Promise<boolean> {
  await entrarComo(correo);
  const lista = await llamadasQueMeSuenan(ids[correo]);
  await salir();
  return lista.some((l) => l.id === llamada);
}

async function llamar(correo: string, datos: Parameters<typeof llamarPorInternet>[0]) {
  await entrarComo(correo);
  try {
    const id = await llamarPorInternet(datos);
    llamadas.push(id);
    return id;
  } finally {
    await salir();
  }
}

beforeAll(async () => {
  for (const correo of [SOFIA, JUAN, MARCELA, AJENO]) {
    ids[correo] = await entrarComo(correo);
    await salir();
  }
  const { data: admins, error } = await servicio
    .from("membresia_condominio")
    .select("usuario_id")
    .eq("condominio_id", CONDOMINIO)
    .in("rol", ["administrador", "coadministrador"])
    .eq("activo", true);
  if (error) throw error;
  administracion = (admins ?? []).filter((a) => a.usuario_id) as { usuario_id: string }[];

  const tocadas = [ids[SOFIA], ids[JUAN], ...administracion.map((a) => a.usuario_id)];
  const { data: perfiles } = await servicio
    .from("perfil")
    .select("id, recibe_llamadas_app")
    .in("id", tocadas);
  for (const p of perfiles ?? []) antes.set(p.id, p.recibe_llamadas_app);
  // Todos encendidos para empezar: es el valor por defecto.
  for (const id of tocadas) await recibir(id, true);

  const { data: juan } = await servicio
    .from("membresia_condominio")
    .select("permisos")
    .eq("usuario_id", ids[JUAN])
    .eq("rol", "guardia")
    .single();
  permisosDeJuan = juan!.permisos;
  await servicio
    .from("membresia_condominio")
    .update({ permisos: { ...(permisosDeJuan as object), llamadas: true } })
    .eq("usuario_id", ids[JUAN])
    .eq("rol", "guardia");
});

afterAll(async () => {
  await salir();
  for (const [id, valor] of antes) await recibir(id, valor);
  await servicio
    .from("membresia_condominio")
    .update({ permisos: permisosDeJuan })
    .eq("usuario_id", ids[JUAN])
    .eq("rol", "guardia");
  if (llamadas.length > 0) {
    const { error } = await servicio.from("llamada_internet").delete().in("id", llamadas);
    expect(error).toBeNull();
  }
});

describe("la administración en las llamadas por la app", () => {
  it("una vivienda llama a la administración, que contesta", async () => {
    const id = await llamar(SOFIA, { destino: "administracion", desdeUnidadId: U102 });
    expect(await leSuena(MARCELA, id)).toBe(true);
    // Y a la portería no: no es para ella.
    expect(await leSuena(JUAN, id)).toBe(false);
    await entrarComo(MARCELA);
    await contestarLlamada(id);
    await salir();
    const { data } = await servicio.from("llamada_internet").select("estado, origen").eq("id", id).single();
    expect(data).toEqual({ estado: "en_curso", origen: "vivienda" });
  });

  it("la administración llama a una vivienda", async () => {
    const id = await llamar(MARCELA, { destino: "vivienda", aUnidadId: U102 });
    expect(await leSuena(SOFIA, id)).toBe(true);
    const { data } = await servicio.from("llamada_internet").select("origen").eq("id", id).single();
    expect(data?.origen).toBe("administracion");
  });

  it("la administración llama a la portería, y no se le suena a sí misma", async () => {
    const id = await llamar(MARCELA, { destino: "porteria", condominioId: CONDOMINIO });
    expect(await leSuena(JUAN, id)).toBe(true);
    // La otra mitad: si quien llama es la administración, no hay respaldo.
    await recibir(ids[JUAN], false);
    await entrarComo(MARCELA);
    expect(await sePuedeLlamarPorLaApp({ destino: "porteria", condominioId: CONDOMINIO })).toBe(false);
    await salir();
    await recibir(ids[JUAN], true);
  });

  it("la portería llama a la administración", async () => {
    const id = await llamar(JUAN, { destino: "administracion", condominioId: CONDOMINIO });
    expect(await leSuena(MARCELA, id)).toBe(true);
  });

  it("alguien de otro edificio no puede llamar a nuestra administración", async () => {
    await entrarComo(AJENO);
    await expect(
      llamarPorInternet({ destino: "administracion", condominioId: CONDOMINIO }),
    ).rejects.toThrow(/No puedes llamar/);
    expect(await sePuedeLlamarPorLaApp({ destino: "administracion", condominioId: CONDOMINIO })).toBe(false);
    await salir();
  });
});

describe("quien apaga «Recibir llamadas por la app»", () => {
  it("con la administración encendida, se puede (el control)", async () => {
    await entrarComo(SOFIA);
    expect(
      await sePuedeLlamarPorLaApp({ destino: "administracion", condominioId: CONDOMINIO, desdeUnidadId: U102 }),
    ).toBe(true);
    await salir();
  });

  it("a quien lo apaga no le suena, aunque otro de su lado sí reciba", async () => {
    const otros = administracion.filter((a) => a.usuario_id !== ids[MARCELA]);
    await recibir(ids[MARCELA], false);
    try {
      if (otros.length > 0) {
        const id = await llamar(SOFIA, { destino: "administracion", desdeUnidadId: U102 });
        expect(await leSuena(MARCELA, id)).toBe(false);
      } else {
        await entrarComo(SOFIA);
        expect(
          await sePuedeLlamarPorLaApp({ destino: "administracion", condominioId: CONDOMINIO, desdeUnidadId: U102 }),
        ).toBe(false);
        await salir();
      }
    } finally {
      await recibir(ids[MARCELA], true);
    }
  });

  it("si nadie del destino las recibe, no se puede llamar por la app", async () => {
    for (const a of administracion) await recibir(a.usuario_id, false);
    try {
      await entrarComo(SOFIA);
      expect(
        await sePuedeLlamarPorLaApp({ destino: "administracion", condominioId: CONDOMINIO, desdeUnidadId: U102 }),
      ).toBe(false);
      await expect(
        llamarPorInternet({ destino: "administracion", desdeUnidadId: U102 }),
      ).rejects.toThrow(/llama por teléfono/);
      await salir();
    } finally {
      for (const a of administracion) await recibir(a.usuario_id, true);
    }
  });

  it("una vivienda que lo apagó no suena cuando la llaman", async () => {
    await recibir(ids[SOFIA], false);
    try {
      // Si nadie más de la 102 las recibe, ni siquiera se puede llamar.
      await entrarComo(MARCELA);
      const sePuede = await sePuedeLlamarPorLaApp({ destino: "vivienda", aUnidadId: U102, condominioId: CONDOMINIO });
      await salir();
      if (sePuede) {
        const id = await llamar(MARCELA, { destino: "vivienda", aUnidadId: U102 });
        expect(await leSuena(SOFIA, id)).toBe(false);
      }
    } finally {
      await recibir(ids[SOFIA], true);
    }
  });
});
