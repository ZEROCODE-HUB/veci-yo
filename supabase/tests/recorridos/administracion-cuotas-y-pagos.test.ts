import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  marcarPago,
  marcarPagosMasivo,
  obtenerPagos,
  obtenerPeriodos,
} from "@/features/directorio/services/cuotas.repo";

/**
 * Recorrido: la administración lleva las cuotas y marca quién pagó.
 *
 * Es dinero, así que valen las reglas del dinero: importe con su moneda (regla
 * 5), y quién marcó el pago con una FK real (regla 2). Que alguien figure como
 * al corriente cuando no lo está es una discusión con un vecino, y la única
 * forma de resolverla es saber quién lo marcó y cuándo.
 *
 * Y una cosa que ya había fallado: la carga masiva anunciaba el tamaño de la
 * lista de entrada, no lo que había registrado. Un archivo con diez códigos de
 * los que solo existen tres decía "10 departamentos marcados".
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U301 = "44444444-4444-4444-4444-444444444444"; // la de Marcela, en mora
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

let cuotaId = "";

/**
 * **Todas** las filas del periodo tal como estaban, no solo la que el
 * recorrido mira.
 *
 * La primera versión guardaba únicamente la de la 301, y la prueba de la carga
 * masiva marca por código: dejó pagadas viviendas que no lo estaban --entre
 * ellas la de Marcela, que existe justamente para estar en mora y probar los
 * filtros de morosidad--. Un recorrido que toca datos compartidos se lleva la
 * foto entera.
 */
let filasOriginales: {
  unidad_id: string;
  pagado: boolean;
  pagado_en: string | null;
  registrado_por: string | null;
}[] = [];

beforeAll(async () => {
  await entrarComo(ADMIN);
  const periodos = await obtenerPeriodos(CONDOMINIO);
  cuotaId = periodos[0].id;

  const { data } = await supabase
    .from("pago_cuota")
    .select("unidad_id, pagado, pagado_en, registrado_por")
    .eq("cuota_id", cuotaId);
  filasOriginales = (data ?? []) as typeof filasOriginales;
});

afterAll(async () => {
  // Se devuelve por escritura directa, no llamando a `marcarPago`: si se está
  // mutando esa función, la restauración escribiría con el código roto.
  await salir();
  await entrarComo(ADMIN);
  for (const fila of filasOriginales) {
    await supabase
      .from("pago_cuota")
      .update({
        pagado: fila.pagado,
        pagado_en: fila.pagado_en,
        registrado_por: fila.registrado_por,
      })
      .eq("cuota_id", cuotaId)
      .eq("unidad_id", fila.unidad_id);
  }
  await salir();
});

describe("las cuotas del condominio", () => {
  it("los periodos vienen con su importe y su moneda", async () => {
    const periodos = await obtenerPeriodos(CONDOMINIO);
    expect(periodos.length).toBeGreaterThan(0);

    for (const p of periodos) {
      // Regla 5: un importe sin moneda no dice nada. 180000 son pesos o son
      // soles, y la diferencia es de cuarenta a uno.
      expect(typeof p.monto).toBe("number");
      expect(p.monto).toBeGreaterThan(0);
      expect(p.moneda).toMatch(/^[A-Z]{3}$/);
    }

    // Del más reciente al más antiguo: es el orden en que se mira.
    const fechas = periodos.map((p) => p.periodo);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it("marca una vivienda como pagada, y queda quién y cuándo", async () => {
    await marcarPago({ cuotaId, unidadId: U301, pagado: true });

    const { data } = await supabase
      .from("pago_cuota")
      .select("pagado, pagado_en, registrado_por")
      .eq("cuota_id", cuotaId)
      .eq("unidad_id", U301)
      .single();

    expect(data!.pagado).toBe(true);
    expect(data!.pagado_en).not.toBeNull();
    // Quién lo marcó, con FK real: sin esto, "yo pagué" contra "aquí no consta"
    // no tiene forma de resolverse.
    const { data: sesion } = await supabase.auth.getUser();
    expect(data!.registrado_por).toBe(sesion.user!.id);
  });

  it("y lo desmarca, que es lo que pasa cuando se corrige un error", async () => {
    await marcarPago({ cuotaId, unidadId: U301, pagado: false });
    const pagos = await obtenerPagos(cuotaId);
    expect(pagos.find((p) => p.unidadId === U301)?.pagado).toBe(false);
  });

  it("la carga masiva cuenta lo que registró, no lo que le pidieron", async () => {
    /*
      El defecto que tuvo: anunciaba el tamaño de la lista de entrada. Con tres
      códigos válidos y dos inventados decía "5 departamentos marcados", y la
      administración se quedaba creyendo que había cobrado de más.
    */
    const { data: unidades } = await supabase
      .from("unidad")
      .select("codigo")
      .limit(2);
    const reales = (unidades ?? []).map((u) => u.codigo);

    const resultado = await marcarPagosMasivo({
      cuotaId,
      codigos: [...reales, "NO-EXISTE-1", "NO-EXISTE-2"],
    });

    expect(resultado.marcadas).toBe(reales.length);
    expect(resultado.noEncontradas.sort()).toEqual([
      "NO-EXISTE-1",
      "NO-EXISTE-2",
    ]);
  });

  it("pero una vecina no marca pagos de nadie", async () => {
    /*
      Marcar un pago es de la administración: es afirmar que entró dinero. Si
      pudiera hacerlo cualquiera, el estado de cuentas del edificio lo
      escribiría quien quisiera.
    */
    /*
      Se deja el pago en `false` **con la administración** justo antes, para
      que el caso no dependa de lo que hiciera la carga masiva anterior: esa
      prueba marca por código y puede tocar esta misma vivienda. Un caso
      negativo contaminado no dice nada.
    */
    await supabase
      .from("pago_cuota")
      .update({ pagado: false })
      .eq("cuota_id", cuotaId)
      .eq("unidad_id", U301);

    await salir();
    await entrarComo(VECINA);
    await marcarPago({ cuotaId, unidadId: U301, pagado: true }).catch(() => {});

    await salir();
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("pago_cuota")
      .select("pagado")
      .eq("cuota_id", cuotaId)
      .eq("unidad_id", U301)
      .single();
    // Con una sesión que sí puede ver: "no lo veo" no es "no pasó".
    expect(data!.pagado).toBe(false);
  });
});
