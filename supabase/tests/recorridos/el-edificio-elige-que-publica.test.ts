import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  guardarVisibilidadCuotas,
  obtenerDetalleCuotas,
  obtenerResumenCuotas,
  obtenerVisibilidadCuotas,
  type VisibilidadCuotas,
} from "@/features/inquilino-lider/services/cuadroHonor.repo";

/**
 * Recorrido: el edificio elige qué publica de las cuotas.
 *
 * Pedido por el cliente el 02/10/2026: «quién pagó / quién no / solo el
 * porcentaje», y que se vea el mes en curso.
 *
 * No es una opción técnica. Publicar quién debe, en un edificio pequeño, es
 * señalar a un vecino por su nombre en la puerta: hay administraciones que lo
 * hacen y otras que no quieren ni oírlo. Por eso lo decide quien responde por
 * el edificio, y por eso lo que se comprueba aquí es que **la elección cambia
 * lo que se devuelve** —una opción que no cambia nada es decorativa—.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

let comoEstaba: VisibilidadCuotas = "porcentaje";

beforeAll(async () => {
  // La fila cruda, y se devuelve con una escritura directa: si se restaurase
  // llamando a la función de la aplicación, mutarla dejaría al cliente con
  // una configuración que él no eligió.
  const { data } = await servicio
    .from("condominio")
    .select("cuotas_visibilidad")
    .eq("id", CONDOMINIO)
    .single();
  comoEstaba = (data?.cuotas_visibilidad ?? "porcentaje") as VisibilidadCuotas;
});

afterAll(async () => {
  await servicio
    .from("condominio")
    .update({ cuotas_visibilidad: comoEstaba })
    .eq("id", CONDOMINIO);
  await salir();
});

describe("el mes en curso", () => {
  it("sale siempre, aunque nadie le haya puesto cuota", async () => {
    /*
      Antes el carrusel recorría `cuota_administracion`, así que un mes sin
      cuota **no existía**: saltaba de agosto a junio y nadie sabía si es que
      todos pagaron o que nadie definió nada.
    */
    await entrarComo(VECINA);
    const periodos = await obtenerResumenCuotas(CONDOMINIO);

    const hoy = new Date();
    const enCurso = `${hoy.getUTCFullYear()}-${String(hoy.getUTCMonth() + 1).padStart(2, "0")}-01`;

    expect(periodos.some((p) => p.periodo === enCurso)).toBe(true);
  });

  it("y si no la tiene, lo dice en vez de enseñar un 0%", async () => {
    const periodos = await obtenerResumenCuotas(CONDOMINIO);
    for (const p of periodos) {
      // La bandera y el dato tienen que contar lo mismo: un mes sin cuota no
      // puede traer dinero esperado, porque entonces el 0% sí sería real.
      if (!p.tieneCuota) expect(p.esperado).toBe(0);
    }
  });
});

describe("lo que ve un vecino según lo que el edificio elija", () => {
  it("con «solo el porcentaje» no ve a nadie por su nombre", async () => {
    await salir();
    await entrarComo(ADMIN);
    await guardarVisibilidadCuotas(CONDOMINIO, "porcentaje");

    await salir();
    await entrarComo(VECINA);
    expect(await obtenerDetalleCuotas(CONDOMINIO)).toEqual([]);
  });

  it("con «quién pagó» ve a los que están al día, y solo a esos", async () => {
    await salir();
    await entrarComo(ADMIN);
    await guardarVisibilidadCuotas(CONDOMINIO, "quien_pago");

    await salir();
    await entrarComo(VECINA);
    const lista = await obtenerDetalleCuotas(CONDOMINIO);

    /*
      El control positivo importa tanto como el negativo: si la lista viniera
      vacía, «no veo morosos» pasaría igual con la función abierta de par en
      par. Es la trampa del caso negativo sin datos.
    */
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((u) => u.pagado)).toBe(true);
  });

  it("con «quién debe» ve también a los que no", async () => {
    await salir();
    await entrarComo(ADMIN);
    await guardarVisibilidadCuotas(CONDOMINIO, "quien_debe");

    await salir();
    await entrarComo(VECINA);
    const lista = await obtenerDetalleCuotas(CONDOMINIO);

    expect(lista.some((u) => !u.pagado)).toBe(true);
  });

  it("y la administración lo ve entero pase lo que pase", async () => {
    /*
      Es quien cobra: ocultárselo no protegería a nadie, le quitaría la
      herramienta. Se comprueba con la opción más cerrada, que es donde la
      excepción tiene sentido.
    */
    await salir();
    await entrarComo(ADMIN);
    await guardarVisibilidadCuotas(CONDOMINIO, "porcentaje");

    const lista = await obtenerDetalleCuotas(CONDOMINIO);
    expect(lista.length).toBeGreaterThan(0);
  });
});

describe("quién puede cambiarlo", () => {
  it("un vecino no", async () => {
    await salir();
    try {
      await entrarComo(VECINA);
      await expect(
        guardarVisibilidadCuotas(CONDOMINIO, "quien_debe"),
      ).rejects.toThrow(/administracion/i);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("la administración sí, y queda guardado", async () => {
    await guardarVisibilidadCuotas(CONDOMINIO, "quien_pago");
    expect(await obtenerVisibilidadCuotas(CONDOMINIO)).toBe("quien_pago");
  });
});
