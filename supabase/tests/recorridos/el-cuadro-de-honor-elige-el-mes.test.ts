import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, pagadaMientrasDure, salir, servicio, supabase } from "./cliente";
import {
  cuadroHonorCuentaMesEnCurso,
  guardarCuadroHonorMesEnCurso,
} from "@/features/inquilino-lider/services/cuadroHonor.repo";

/**
 * Recorrido: la administración elige si el Cuadro de Honor cuenta el mes en
 * curso (27/10/2026, hueco 53).
 *
 * Se trae su propio mes sin vencer --el que viene, con vencimiento a fin de
 * mes-- y mira cuántos meses cuenta el cuadro con el interruptor encendido y
 * apagado: la diferencia tiene que ser ese mes. La 102 queda al día en todos
 * los meses mientras dura, porque el cuadro solo enseña a quien está al día.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMINISTRACION = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";
const U102 = "44444444-4444-4444-4444-444444444443";
const deshacerPagos: Array<() => Promise<void>> = [];

let cuotaId = "";
let comoEstaba: boolean | null = null;

function primeroDelMesQueViene(): { periodo: string; vence: string } {
  const hoy = new Date();
  const siguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { periodo: iso(siguiente), vence: iso(fin) };
}

/** Cuántos meses le cuenta el cuadro a la 102. */
async function mesesQueCuenta(): Promise<number> {
  const { data, error } = await supabase.rpc("cuadro_honor", { p_condominio_id: CONDOMINIO });
  if (error) throw error;
  const fila = (data ?? []).find((f: { unidad_id: string }) => f.unidad_id === U102);
  expect(fila, "la 102, al día, tiene que salir en el cuadro").toBeTruthy();
  return fila!.periodos_totales ?? 0;
}

beforeAll(async () => {
  const { data: condominio } = await servicio
    .from("condominio")
    .select("cuadro_honor_mes_en_curso")
    .eq("id", CONDOMINIO)
    .single();
  comoEstaba = condominio!.cuadro_honor_mes_en_curso;

  const { periodo, vence } = primeroDelMesQueViene();
  const { data: ya } = await servicio
    .from("cuota_administracion")
    .select("id")
    .eq("condominio_id", CONDOMINIO)
    .eq("periodo", periodo)
    .maybeSingle();
  // Si el mes que viene ya existe es del cliente: se usa y no se borra.
  if (!ya) {
    const { data, error } = await servicio
      .from("cuota_administracion")
      .insert({ condominio_id: CONDOMINIO, periodo, vence_en: vence, monto: 1, moneda: "COP" })
      .select("id")
      .single();
    if (error) throw error;
    cuotaId = data.id;
  }

  const { data: meses } = await servicio
    .from("cuota_administracion")
    .select("id")
    .eq("condominio_id", CONDOMINIO);
  for (const mes of meses ?? []) deshacerPagos.push(await pagadaMientrasDure(mes.id, U102));
});

afterAll(async () => {
  await salir();
  await servicio
    .from("condominio")
    .update({ cuadro_honor_mes_en_curso: comoEstaba })
    .eq("id", CONDOMINIO);
  for (const deshacer of deshacerPagos) await deshacer();
  if (cuotaId) {
    const { error } = await servicio.from("cuota_administracion").delete().eq("id", cuotaId);
    if (error) throw new Error(`No se pudo borrar el mes de prueba: ${error.message}`);
  }
});

describe("el mes en curso en el Cuadro de Honor", () => {
  it("encendido cuenta un mes más que apagado: el que todavía no vence", async () => {
    await entrarComo(ADMINISTRACION);
    await guardarCuadroHonorMesEnCurso(CONDOMINIO, true);
    expect(await cuadroHonorCuentaMesEnCurso(CONDOMINIO)).toBe(true);
    const conElMes = await mesesQueCuenta();

    await guardarCuadroHonorMesEnCurso(CONDOMINIO, false);
    expect(await cuadroHonorCuentaMesEnCurso(CONDOMINIO)).toBe(false);
    const sinElMes = await mesesQueCuenta();
    await salir();

    expect(conElMes - sinElMes).toBeGreaterThanOrEqual(1);
  });

  it("sin elegir, vale el de la plataforma (apagado)", async () => {
    await servicio.from("condominio").update({ cuadro_honor_mes_en_curso: null }).eq("id", CONDOMINIO);
    await entrarComo(VECINA);
    expect(await cuadroHonorCuentaMesEnCurso(CONDOMINIO)).toBe(false);
    await salir();
  });

  it("la vecina no lo cambia", async () => {
    await entrarComo(VECINA);
    await expect(guardarCuadroHonorMesEnCurso(CONDOMINIO, true)).rejects.toThrow(/Solo la administración/);
    await salir();
    const { data } = await servicio
      .from("condominio")
      .select("cuadro_honor_mes_en_curso")
      .eq("id", CONDOMINIO)
      .single();
    expect(data!.cuadro_honor_mes_en_curso).toBeNull();
  });
});
