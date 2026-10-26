import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase, servicio } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import {
  aprobarDocumentoAMano,
  verificarEnPorteria,
} from "@/features/visitas/services/porteria.repo";

/**
 * Recorrido: la portería aprueba un documento a mano (26/10/2026).
 *
 * El cliente: si lo escaneado no coincide, se puede volver a escanear o
 * aprobarlo a mano, «pero ahí sale una advertencia y se guarda quién lo está
 * aprobando». Se comprueba lo que queda en la base --verificado, a mano, y el
 * guardia como quien lo aprobó--, que solo la portería puede hacerlo, y que una
 * verificación por número posterior deja de contar como «a mano».
 *
 * Y los errores de la app (`error_de_la_app`): cada uno escribe los suyos, nadie
 * los lee por la API.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] aprobar a mano";

let visitaId = "";
let invitadoId = "";
let guardiaId = "";
const errores: string[] = [];

async function verificacion() {
  const { data } = await servicio
    .from("verificacion_documento")
    .select("estado, aprobado_a_mano, verificado_por")
    .eq("invitado_id", invitadoId)
    .single();
  return data;
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    profesion: MARCA,
    instruccionDocumento: "verificar",
    invitados: [{ nombre: "[prueba] sin coincidir", documentoNumero: "55511122" }],
  });
  const { data } = await supabase.from("invitado").select("id").eq("visita_id", visitaId).single();
  invitadoId = data!.id;
  await salir();
  guardiaId = await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  if (invitadoId) {
    const { error } = await servicio.from("verificacion_documento").delete().eq("invitado_id", invitadoId);
    if (error) throw error;
  }
  if (visitaId) {
    const { error } = await servicio.from("visita").delete().eq("id", visitaId);
    if (error) throw error;
  }
  if (errores.length) {
    const { error } = await servicio.from("error_de_la_app").delete().in("id", errores);
    if (error) throw error;
  }
});

describe("aprobar el documento a mano", () => {
  it("quien no es de la portería no puede", async () => {
    await salir();
    await entrarComo(ANFITRIONA);
    await expect(aprobarDocumentoAMano(invitadoId)).rejects.toThrow(/no esta en la lista de la porteria/i);
    expect(await verificacion()).toBeNull();
    await salir();
    await entrarComo(GUARDIA);
  });

  it("la portería sí, y queda verificado, a mano, y quién lo aprobó", async () => {
    // Antes, por número, no coincide: es el caso de uso.
    expect(await verificarEnPorteria(invitadoId, "99999999")).toBe(false);
    expect((await verificacion())?.estado).toBe("no_coincide");

    expect(await aprobarDocumentoAMano(invitadoId)).toBe(true);
    expect(await verificacion()).toEqual({
      estado: "verificado",
      aprobado_a_mano: true,
      verificado_por: guardiaId,
    });
  });

  it("si después coincide por número, ya no cuenta como a mano", async () => {
    expect(await verificarEnPorteria(invitadoId, "55.511.122")).toBe(true);
    expect(await verificacion()).toEqual({
      estado: "verificado",
      aprobado_a_mano: false,
      verificado_por: guardiaId,
    });
  });
});

describe("los errores de la app", () => {
  it("cada uno anota los suyos", async () => {
    const { error } = await supabase.from("error_de_la_app").insert({
      usuario_id: guardiaId,
      tipo: "rastro",
      donde: "escaneo: prueba",
      mensaje: MARCA,
    });
    expect(error).toBeNull();
    const { data } = await servicio.from("error_de_la_app").select("id").eq("mensaje", MARCA);
    expect(data).toHaveLength(1);
    errores.push(...(data ?? []).map((f) => f.id));
  });

  it("nadie los lee por la API, ni los suyos", async () => {
    const { data } = await supabase.from("error_de_la_app").select("id").eq("mensaje", MARCA);
    expect(data ?? []).toHaveLength(0);
  });

  it("no se puede anotar a nombre de otro", async () => {
    const { data: otro } = await servicio.from("perfil").select("id").neq("id", guardiaId).limit(1).single();
    const { error } = await supabase.from("error_de_la_app").insert({
      usuario_id: otro!.id,
      mensaje: `${MARCA} ajeno`,
    });
    expect(error?.message).toMatch(/row-level security/);
  });
});
