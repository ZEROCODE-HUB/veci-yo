import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import { atenderSos, sosActivas } from "@/features/perfil/services/sos.repo";

/**
 * Recorrido: la portería atiende un S.O.S. (14/10/2026).
 *
 * Lo pidió la responsable de producto: la alarma llega al guardia y la única
 * salida es desactivarla reportando la incidencia (qué pasó, qué vio), que
 * queda como PQRS de seguridad.
 *
 * La alarma se siembra con la clave de servicio: nadie pulsa el botón de
 * S.O.S. de una persona (regla del cliente).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const VECINA = "vecino@veciyo.test";
const AJENA = "vecino2@veciyo.test"; // Bruno, del otro edificio

let alarmaId = "";
let reclamoId = "";

beforeAll(async () => {
  const sofia = await entrarComo(VECINA);
  await salir();
  const { data, error } = await servicio
    .from("alarma_sos")
    .insert({ condominio_id: CONDOMINIO, usuario_id: sofia, unidad_id: U102 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  alarmaId = data!.id;
});

afterAll(async () => {
  await servicio.from("notificacion").delete().eq("entidad_id", alarmaId);
  if (reclamoId) await servicio.from("reclamo").delete().eq("id", reclamoId);
  const { error } = await servicio.from("alarma_sos").delete().eq("id", alarmaId);
  expect(error).toBeNull();
});

describe("el S.O.S. en la portería", () => {
  it("la portería la ve abierta, con su vivienda; alguien de otro edificio no", async () => {
    await entrarComo(GUARDIA);
    const abiertas = await sosActivas();
    await salir();
    expect(abiertas.find((a) => a.id === alarmaId)?.unidad).toBe("102");

    await entrarComo(AJENA);
    const ajenas = await sosActivas();
    await salir();
    expect(ajenas.find((a) => a.id === alarmaId)).toBeUndefined();
  });

  it("no se desactiva sin decir qué pasó y qué vio", async () => {
    await entrarComo(GUARDIA);
    await expect(atenderSos(alarmaId, "Se cayó", " ")).rejects.toThrow(/que paso y que viste/i);
    await salir();
  });

  it("una vecina no la desactiva por la portería", async () => {
    await entrarComo(AJENA);
    await expect(atenderSos(alarmaId, "x", "y")).rejects.toThrow(/solo la porteria/i);
    await salir();
  });

  it("al desactivarla queda la incidencia en PQRS y la alarma, atendida", async () => {
    await entrarComo(GUARDIA);
    reclamoId = await atenderSos(alarmaId, "Se cayó en la escalera", "Estaba consciente; llamé a la ambulancia");
    await salir();

    const { data: reclamo } = await servicio
      .from("reclamo")
      .select("categoria, alarma_sos_id, descripcion, unidad_id")
      .eq("id", reclamoId)
      .single();
    expect(reclamo!.categoria).toBe("seguridad");
    expect(reclamo!.alarma_sos_id).toBe(alarmaId);
    expect(reclamo!.unidad_id).toBe(U102);
    expect(reclamo!.descripcion).toContain("Estaba consciente");

    const { data: alarma } = await servicio
      .from("alarma_sos")
      .select("cerrada_en, cierre")
      .eq("id", alarmaId)
      .single();
    expect(alarma!.cierre).toBe("atendida");
    expect(alarma!.cerrada_en).toBeTruthy();
  });

  it("y ya no se puede atender dos veces", async () => {
    await entrarComo(GUARDIA);
    await expect(atenderSos(alarmaId, "a", "b")).rejects.toThrow(/ya estaba cerrada/i);
    await salir();
  });
});
