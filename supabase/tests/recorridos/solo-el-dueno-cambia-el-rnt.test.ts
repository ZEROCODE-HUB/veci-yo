import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: solo el dueño carga o cambia el RNT (15/10/2026).
 *
 * KT 0.6 y 4.1: el RNT está a nombre del dueño y solo él lo completa. En la
 * base lo podía cambiar cualquiera que configure el alojamiento, también la
 * administración. Aquí la dueña de la 102 lo cambia y la administradora no.
 */
const U102 = "44444444-4444-4444-4444-444444444443";
const DUENA = "vecino@veciyo.test"; // Sofía, propietaria de la 102
const ADMIN = "admin@veciyo.test"; // Marcela, administra el edificio

let antes: { rnt: string | null; rnt_vence_en: string | null } | null = null;

beforeAll(async () => {
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("rnt, rnt_vence_en")
    .eq("unidad_id", U102)
    .single();
  if (error) throw error;
  antes = data;
});

afterAll(async () => {
  await salir();
  // Escritura cruda con la clave de servicio: la restauración no pasa por la
  // regla que se comprueba.
  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .update({ rnt: antes!.rnt, rnt_vence_en: antes!.rnt_vence_en })
    .eq("unidad_id", U102);
  if (error) throw error;
  if (antes!.rnt) {
    await servicio.from("registro_turismo").update({ numero: antes!.rnt }).eq("unidad_id", U102);
  }
});

describe("el RNT de la 102", () => {
  it("lo cambia la dueña", async () => {
    await entrarComo(DUENA);
    const { error } = await supabase.rpc("guardar_alojamiento", {
      p_unidad_id: U102,
      p_rnt: "[prueba] RNT-DUENA",
    });
    await salir();
    expect(error).toBeNull();
    const { data } = await servicio
      .from("suscripcion_renta_corta")
      .select("rnt")
      .eq("unidad_id", U102)
      .single();
    expect(data!.rnt).toBe("[prueba] RNT-DUENA");
  });

  it("la administración no", async () => {
    await entrarComo(ADMIN);
    const { error } = await supabase.rpc("guardar_alojamiento", {
      p_unidad_id: U102,
      p_rnt: "[prueba] RNT-ADMIN",
    });
    await salir();
    expect(error?.message).toMatch(/Solo el propietario de la vivienda puede cargar o cambiar el RNT/);
  });

  it("ni escribiendo directo en el registro de turismo", async () => {
    await entrarComo(ADMIN);
    const { error } = await supabase
      .from("registro_turismo")
      .update({ numero: "[prueba] RNT-ADMIN" })
      .eq("unidad_id", U102);
    await salir();
    expect(error?.message).toMatch(/Solo el propietario/);
  });

  it("y guardar el alojamiento sin tocar el RNT sigue funcionando para la administración", async () => {
    await entrarComo(ADMIN);
    const { error } = await supabase.rpc("guardar_alojamiento", { p_unidad_id: U102 });
    await salir();
    expect(error).toBeNull();
  });
});
