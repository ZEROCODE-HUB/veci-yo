import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearCuotaDelMes,
  guardarConfiguracionCuotas,
  guardarCuotaDeUnidad,
  marcarPago,
  obtenerComite,
  obtenerConfiguracionCuotas,
  obtenerCuotasPorUnidad,
  obtenerPeriodos,
  ponerEnComite,
} from "@/features/directorio/services/cuotas.repo";

/**
 * Recorrido: la administración dice cuánto cobra, crea el mes y lleva el
 * comité de propietarios (decidido con el cliente el 13/10/2026).
 *
 * Hasta entonces el mes de cuota solo existía si alguien lo escribía en la
 * base, y el comité vivía en la memoria del teléfono.
 *
 * Todo lo que crea va **lejos de lo que miran los demás archivos**: los meses
 * son de 2019 --los otros recorridos toman «el mes más reciente», que no
 * puede ser este--, y la tarea diaria se prueba en el segundo edificio, que no
 * tiene cuotas. Lo que cambia de filas compartidas --la configuración del
 * edificio, el importe de una vivienda-- se guarda crudo y se devuelve con la
 * clave de servicio.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const OTRO_CONDOMINIO = "22222222-2222-2222-2222-222222222222";
const U102 = "44444444-4444-4444-4444-444444444443";
const U301 = "44444444-4444-4444-4444-444444444444"; // Marcela, con cuenta
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

const MES = "2019-03-01";
const MES_SIN_IMPORTE = "2019-04-01";
const COLUMNAS =
  "cuota_monto, cuota_moneda, cuota_dia_vencimiento, cuota_automatica";

type Configuracion = {
  cuota_monto: string | null;
  cuota_moneda: string | null;
  cuota_dia_vencimiento: number | null;
  cuota_automatica: boolean;
};

let configuracionOriginal: Configuracion;
let configuracionDelOtro: Configuracion;
let importeOriginal301: string | null = null;
let comiteOriginal = new Set<string>();

async function quitarMesesDePrueba() {
  const { error } = await servicio
    .from("cuota_administracion")
    .delete()
    .eq("condominio_id", CONDOMINIO)
    .in("periodo", [MES, MES_SIN_IMPORTE]);
  if (error) throw error;

  // El segundo edificio no tiene cuotas: todo lo que haya es de esta prueba.
  const { error: errorOtro } = await servicio
    .from("cuota_administracion")
    .delete()
    .eq("condominio_id", OTRO_CONDOMINIO);
  if (errorOtro) throw errorOtro;
}

beforeAll(async () => {
  const { data: uno, error: e1 } = await servicio
    .from("condominio")
    .select(COLUMNAS)
    .eq("id", CONDOMINIO)
    .single();
  if (e1) throw e1;
  configuracionOriginal = uno as Configuracion;

  const { data: dos, error: e2 } = await servicio
    .from("condominio")
    .select(COLUMNAS)
    .eq("id", OTRO_CONDOMINIO)
    .single();
  if (e2) throw e2;
  configuracionDelOtro = dos as Configuracion;

  const { data: unidad, error: e3 } = await servicio
    .from("unidad")
    .select("cuota_monto")
    .eq("id", U301)
    .single();
  if (e3) throw e3;
  importeOriginal301 = unidad.cuota_monto;

  const { data: comite, error: e4 } = await servicio
    .from("comite_propietarios")
    .select("id")
    .eq("condominio_id", CONDOMINIO);
  if (e4) throw e4;
  comiteOriginal = new Set((comite ?? []).map((fila) => fila.id));

  // Una corrida que murió a medias deja sus meses: se retiran antes de empezar.
  await quitarMesesDePrueba();
  await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();
  await quitarMesesDePrueba();

  const { error: e1 } = await servicio
    .from("condominio")
    .update(configuracionOriginal)
    .eq("id", CONDOMINIO);
  if (e1) throw e1;

  const { error: e2 } = await servicio
    .from("condominio")
    .update(configuracionDelOtro)
    .eq("id", OTRO_CONDOMINIO);
  if (e2) throw e2;

  const { error: e3 } = await servicio
    .from("unidad")
    .update({ cuota_monto: importeOriginal301 })
    .eq("id", U301);
  if (e3) throw e3;

  const { data: comite, error: e4 } = await servicio
    .from("comite_propietarios")
    .select("id")
    .eq("condominio_id", CONDOMINIO);
  if (e4) throw e4;
  const nuevas = (comite ?? [])
    .map((fila) => fila.id)
    .filter((id) => !comiteOriginal.has(id));
  if (nuevas.length) {
    const { error: e5 } = await servicio
      .from("comite_propietarios")
      .delete()
      .in("id", nuevas);
    if (e5) throw e5;
  }
});

describe("la configuración de la cuota", () => {
  it("la administración la guarda y se lee igual", async () => {
    await guardarConfiguracionCuotas(CONDOMINIO, {
      monto: 123456,
      moneda: "COP",
      diaVencimiento: 10,
      automatica: false,
    });

    expect(await obtenerConfiguracionCuotas(CONDOMINIO)).toEqual({
      monto: 123456,
      moneda: "COP",
      diaVencimiento: 10,
      automatica: false,
    });
  });

  it("no acepta un día que no existe en febrero, ni crear el mes solo sin importe", async () => {
    await expect(
      guardarConfiguracionCuotas(CONDOMINIO, {
        monto: 123456,
        moneda: "COP",
        diaVencimiento: 31,
        automatica: false,
      }),
    ).rejects.toThrow(/del 1 al 28/);

    await expect(
      guardarConfiguracionCuotas(CONDOMINIO, {
        monto: null,
        moneda: "COP",
        diaVencimiento: 10,
        automatica: true,
      }),
    ).rejects.toThrow(/hace falta el importe/);

    // Ninguno de los dos intentos dejó nada escrito.
    expect((await obtenerConfiguracionCuotas(CONDOMINIO))?.monto).toBe(123456);
  });

  it("una vecina no la cambia", async () => {
    await salir();
    await entrarComo(VECINA);

    await expect(
      guardarConfiguracionCuotas(CONDOMINIO, {
        monto: 1,
        moneda: "COP",
        diaVencimiento: 1,
        automatica: false,
      }),
    ).rejects.toThrow(/Solo la administración/);

    // Y por la tabla tampoco: la política de escritura es de la administración.
    await supabase
      .from("condominio")
      .update({ cuota_monto: 1 })
      .eq("id", CONDOMINIO);

    await salir();
    await entrarComo(ADMIN);
    expect((await obtenerConfiguracionCuotas(CONDOMINIO))?.monto).toBe(123456);
  });
});

describe("el mes de cuota", () => {
  it("se crea con el importe y el vencimiento configurados", async () => {
    const id = await crearCuotaDelMes(CONDOMINIO, "2019-03-15");

    const periodos = await obtenerPeriodos(CONDOMINIO);
    const mes = periodos.find((p) => p.id === id);
    expect(mes).toMatchObject({
      periodo: MES,
      monto: 123456,
      moneda: "COP",
      venceEn: "2019-03-10",
    });
  });

  it("crearlo dos veces no crea dos", async () => {
    const primero = await crearCuotaDelMes(CONDOMINIO, MES);
    const segundo = await crearCuotaDelMes(CONDOMINIO, MES);
    expect(segundo).toBe(primero);

    const { count } = await supabase
      .from("cuota_administracion")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", CONDOMINIO)
      .eq("periodo", MES);
    expect(count).toBe(1);
  });

  it("no se crea a años vista", async () => {
    await expect(crearCuotaDelMes(CONDOMINIO, "2031-01-01")).rejects.toThrow(
      /el mes que corre o el siguiente/,
    );
  });

  it("una vecina no lo crea", async () => {
    await salir();
    await entrarComo(VECINA);
    await expect(crearCuotaDelMes(CONDOMINIO, MES_SIN_IMPORTE)).rejects.toThrow(
      /Solo la administración/,
    );
    await salir();
    await entrarComo(ADMIN);
  });

  it("sin importe configurado no hay mes que crear", async () => {
    await guardarConfiguracionCuotas(CONDOMINIO, {
      monto: null,
      moneda: "COP",
      diaVencimiento: 10,
      automatica: false,
    });

    await expect(crearCuotaDelMes(CONDOMINIO, MES_SIN_IMPORTE)).rejects.toThrow(
      /cuánto se cobra/,
    );

    await guardarConfiguracionCuotas(CONDOMINIO, {
      monto: 123456,
      moneda: "COP",
      diaVencimiento: 10,
      automatica: false,
    });
  });
});

describe("el importe propio de una vivienda", () => {
  it("el pago anota lo que paga esa vivienda, no el general", async () => {
    const cuotaId = await crearCuotaDelMes(CONDOMINIO, MES);
    await guardarCuotaDeUnidad(U301, 999000);
    expect((await obtenerCuotasPorUnidad(CONDOMINIO))[U301]).toBe(999000);

    await marcarPago({ cuotaId, unidadId: U301, pagado: true });
    await marcarPago({ cuotaId, unidadId: U102, pagado: true });

    const { data } = await supabase
      .from("pago_cuota")
      .select("unidad_id, monto")
      .eq("cuota_id", cuotaId);
    const monto = (unidad: string) =>
      Number(data?.find((fila) => fila.unidad_id === unidad)?.monto);

    expect(monto(U301)).toBe(999000);
    // El control: la que no tiene importe propio paga el del mes.
    expect(monto(U102)).toBe(123456);
  });

  it("vaciarlo la devuelve al general", async () => {
    await guardarCuotaDeUnidad(U301, null);
    expect((await obtenerCuotasPorUnidad(CONDOMINIO))[U301]).toBeUndefined();
  });

  it("una vecina no cambia lo que paga nadie, ni ella", async () => {
    await salir();
    await entrarComo(VECINA);
    await expect(guardarCuotaDeUnidad(U102, 1)).rejects.toThrow(
      /Solo la administración/,
    );
    await salir();
    await entrarComo(ADMIN);
    expect((await obtenerCuotasPorUnidad(CONDOMINIO))[U102]).toBeUndefined();
  });
});

describe("el comité de propietarios", () => {
  it("se entra y se sale, y queda en la base", async () => {
    await ponerEnComite(U301, true);
    expect((await obtenerComite(CONDOMINIO))[U301]).toEqual({
      tieneCuenta: true,
      enComite: true,
    });

    // Marcarlo otra vez no lo duplica.
    await ponerEnComite(U301, true);
    const { count } = await supabase
      .from("comite_propietarios")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", CONDOMINIO)
      .is("hasta", null);
    expect(count).toBe(comiteOriginal.size + 1);

    await ponerEnComite(U301, false);
    expect((await obtenerComite(CONDOMINIO))[U301].enComite).toBe(false);
  });

  it("una vecina no nombra a nadie, ni ve la lista", async () => {
    await salir();
    await entrarComo(VECINA);
    await expect(ponerEnComite(U301, true)).rejects.toThrow(
      /Solo la administración/,
    );
    await expect(obtenerComite(CONDOMINIO)).rejects.toThrow(
      /Solo la administración/,
    );
    await salir();
    await entrarComo(ADMIN);
    expect((await obtenerComite(CONDOMINIO))[U301].enComite).toBe(false);
  });
});

describe("la tarea que crea el mes sola", () => {
  it("lo crea en el edificio que lo pide, una vez, y en ninguno más", async () => {
    const { error } = await servicio
      .from("condominio")
      .update({
        cuota_monto: 50000,
        cuota_moneda: "COP",
        cuota_dia_vencimiento: 5,
        cuota_automatica: true,
      })
      .eq("id", OTRO_CONDOMINIO);
    if (error) throw error;

    const antes = (await obtenerPeriodos(CONDOMINIO)).length;

    const primera = await servicio.rpc("crear_cuotas_del_mes");
    if (primera.error) throw primera.error;
    expect(primera.data).toBe(1);

    const { data: creados } = await servicio
      .from("cuota_administracion")
      .select("periodo, monto, moneda, vence_en")
      .eq("condominio_id", OTRO_CONDOMINIO);
    expect(creados).toHaveLength(1);
    expect(Number(creados![0].monto)).toBe(50000);
    // El día 1 del mes, y vence el 5 de ese mismo mes.
    expect(creados![0].periodo).toMatch(/-01$/);
    expect(creados![0].vence_en).toBe(
      `${creados![0].periodo.slice(0, 7)}-05`,
    );

    // La segunda pasada del mismo día no crea nada.
    const segunda = await servicio.rpc("crear_cuotas_del_mes");
    if (segunda.error) throw segunda.error;
    expect(segunda.data).toBe(0);

    // Y el edificio que la tiene apagada sigue con los meses que tenía.
    expect((await obtenerPeriodos(CONDOMINIO)).length).toBe(antes);
  });
});
