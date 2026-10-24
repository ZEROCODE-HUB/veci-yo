import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, pagadaMientrasDure } from "./cliente";
import { obtenerCuadroHonor, obtenerMiCuota } from "@/features/inquilino-lider/services/cuadroHonor.repo";

/**
 * Recorrido: cada quien ve el estado de su cuota (15/10/2026, hueco 13).
 *
 * Nadie podía ver si su vivienda estaba al día. Lo que se compara es contra la
 * fila cruda, leída con la clave de servicio, para no depender de quién haya
 * pagado hoy: Sofía ve el de la 102 tal cual está, y el de otra vivienda
 * pagada no se lo enseña la base aunque lo pida.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test";
const GUILLERMO = "propietario@veciyo.test"; // de la 101 y la 205
const U101 = "44444444-4444-4444-4444-444444444441";
const U205 = "44444444-4444-4444-4444-444444444442";

let cuotaId = "";
let visibilidadAntes = "porcentaje";
let unidadPagadaDeGuillermo = "";
let deshacerPago: (() => Promise<void>) | null = null;

/** Lo que dice la fila cruda de esa vivienda en esa cuota. */
const pagadaDeVerdad = async (unidadId: string) => {
  const { data } = await servicio
    .from("pago_cuota")
    .select("pagado")
    .eq("cuota_id", cuotaId)
    .eq("unidad_id", unidadId)
    .maybeSingle();
  return data?.pagado ?? false;
};

const publicar = async (valor: "porcentaje" | "quien_pago" | "quien_debe") => {
  const { error } = await servicio.from("condominio").update({ cuotas_visibilidad: valor }).eq("id", CONDOMINIO);
  if (error) throw new Error(error.message);
};

beforeAll(async () => {
  const { data: cond } = await servicio.from("condominio").select("cuotas_visibilidad").eq("id", CONDOMINIO).single();
  visibilidadAntes = cond!.cuotas_visibilidad;
  const { data: c } = await servicio
    .from("cuota_administracion")
    .select("id")
    .eq("condominio_id", CONDOMINIO)
    .order("periodo", { ascending: false })
    .limit(1)
    .single();
  cuotaId = c!.id;

  // Una vivienda de Guillermo pagada: si no hay ninguna, se trae la suya.
  for (const u of [U205, U101]) {
    if (await pagadaDeVerdad(u)) {
      unidadPagadaDeGuillermo = u;
      break;
    }
  }
  if (!unidadPagadaDeGuillermo) {
    deshacerPago = await pagadaMientrasDure(cuotaId, U205);
    unidadPagadaDeGuillermo = U205;
  }

});

afterAll(async () => {
  await salir();
  await publicar(visibilidadAntes as "porcentaje");
  await deshacerPago?.();
});

describe("la cuota de mi vivienda", () => {
  it("Sofía ve la de la 102 tal como está", async () => {
    await entrarComo(SOFIA);
    const mia = await obtenerMiCuota(CONDOMINIO, U102);
    await salir();
    expect(mia).not.toBeNull();
    expect(mia!.pagado).toBe(await pagadaDeVerdad(U102));
    expect(mia!.monto).toBeGreaterThan(0);
  });

  it("el dueño ve la suya pagada", async () => {
    // El control del caso de abajo: la vivienda sí está pagada.
    await entrarComo(GUILLERMO);
    const suya = await obtenerMiCuota(CONDOMINIO, unidadPagadaDeGuillermo);
    await salir();
    expect(suya!.pagado).toBe(true);
  });

  it("pero Sofía no ve el pago de una vivienda ajena", async () => {
    await entrarComo(SOFIA);
    const ajena = await obtenerMiCuota(CONDOMINIO, unidadPagadaDeGuillermo);
    await salir();
    expect(ajena!.pagado).toBe(false);
  });
});

/*
  El Cuadro de Honor decía quién estaba al día con cualquier opción. Ahora
  obedece lo que la administración elige publicar (hueco 13).
*/
describe("el Cuadro de Honor y lo que se publica", () => {
  const cuadroDe = async (correo: string) => {
    await entrarComo(correo);
    const cuadro = await obtenerCuadroHonor(CONDOMINIO);
    await salir();
    return cuadro;
  };

  it("con «quién está al día», lista solo a los que pagan y dice sus cuotas", async () => {
    await publicar("quien_pago");
    const cuadro = await cuadroDe(SOFIA);
    expect(cuadro.length).toBeGreaterThan(0);
    expect(cuadro.every((u) => u.contador !== null)).toBe(true);
    // La 301 de Marcela, sin pagar, no sale.
    expect(cuadro.some((u) => u.departamento.startsWith("Departamento 301 "))).toBe(false);
  });

  it("con «solo el porcentaje», lista todas las viviendas y no dice nada de cuotas", async () => {
    await publicar("porcentaje");
    const cuadro = await cuadroDe(SOFIA);
    expect(cuadro.some((u) => u.departamento.startsWith("Departamento 301 "))).toBe(true);
    expect(cuadro.every((u) => u.contador === null)).toBe(true);
  });

  it("y la administración lo ve todo igual", async () => {
    const cuadro = await cuadroDe("admin@veciyo.test");
    expect(cuadro.every((u) => u.contador !== null)).toBe(true);
  });
});
