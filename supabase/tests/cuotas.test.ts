import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  entrar,
  fueRechazada,
  leer,
  rpc,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * El registro de pagos de la cuota de administración (KT flujo 4.6).
 *
 * La lectura funcionaba —el Cuadro de Honor dice quién está al día— y la
 * escritura no llegaba a la base: la casilla guardaba en un store de Zustand y
 * la carga masiva era `await delay(200); return unidadIds;` seguido de un
 * "N departamentos marcados como pagados". `grep pago_cuota src/` no devolvía
 * nada: el Cuadro de Honor mostraba un estado que ninguna pantalla podía
 * cambiar.
 *
 * Y la política que lo habría recibido era `for all` con
 * `puede_operar_unidad`, que incluye al personal del condominio: **un
 * residente podía marcarse a sí mismo como pagado**, y un guardia también.
 */

let marcela: Sesion;
let guillermo: Sesion;
let guardia: Sesion;

let cuotaId = "";

beforeAll(async () => {
  [marcela, guillermo, guardia] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.guardia),
  ]);

  const periodos = await leer(
    marcela,
    `cuota_administracion?condominio_id=eq.${CONDOMINIO}&select=id,periodo&order=periodo.desc&limit=1`,
  );
  cuotaId = periodos.datos[0].id;
});

/** Deja la 101 como estaba: sin pago registrado en ese periodo. */
afterAll(async () => {
  await api(
    marcela,
    `/rest/v1/pago_cuota?cuota_id=eq.${cuotaId}&unidad_id=eq.${UNIDAD.u101}`,
    { metodo: "DELETE" },
  );
});

describe("quién registra un pago", () => {
  it("la administración lo registra, con fecha y actor", async () => {
    const respuesta = await rpc(marcela, "marcar_pago_cuota", {
      p_cuota_id: cuotaId,
      p_unidad_id: UNIDAD.u101,
      p_pagado: true,
    });
    expect(respuesta.estado).toBeLessThan(300);

    const fila = await leer(
      marcela,
      `pago_cuota?cuota_id=eq.${cuotaId}&unidad_id=eq.${UNIDAD.u101}&select=pagado,pagado_en,monto,origen,registrado_por`,
    );
    expect(fila.datos[0].pagado).toBe(true);
    // La restricción de la tabla exige la fecha; la función la pone.
    expect(fila.datos[0].pagado_en).toBeTruthy();
    expect(Number(fila.datos[0].monto)).toBeGreaterThan(0);
    expect(fila.datos[0].origen).toBe("manual");
    expect(fila.datos[0].registrado_por).toBe(marcela.usuarioId);
  });

  it("**el propietario no se marca a sí mismo**", async () => {
    /*
      Era lo que permitía `puede_operar_unidad`: quien vive en la vivienda
      podía declararse al día y aparecer en el Cuadro de Honor sin haber
      pagado.
    */
    const intento = await rpc(guillermo, "marcar_pago_cuota", {
      p_cuota_id: cuotaId,
      p_unidad_id: UNIDAD.u101,
      p_pagado: true,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("y tampoco escribiendo la tabla directamente", async () => {
    const intento = await api(guillermo, "/rest/v1/pago_cuota", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        cuota_id: cuotaId,
        unidad_id: UNIDAD.u101,
        pagado: true,
        pagado_en: new Date().toISOString().slice(0, 10),
      },
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("la portería tampoco", async () => {
    const intento = await rpc(guardia, "marcar_pago_cuota", {
      p_cuota_id: cuotaId,
      p_unidad_id: UNIDAD.u101,
      p_pagado: true,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero el propietario sí ve el suyo", async () => {
    // Control positivo: lo que se cierra es escribir, no mirar.
    const fila = await leer(
      guillermo,
      `pago_cuota?cuota_id=eq.${cuotaId}&unidad_id=eq.${UNIDAD.u101}&select=pagado`,
    );
    expect(fila.datos).toHaveLength(1);
  });

  it("y no ve el de una vivienda ajena", async () => {
    const ajeno = await leer(
      guillermo,
      `pago_cuota?unidad_id=eq.${UNIDAD.u102}&select=unidad_id`,
    );
    expect(ajeno.datos).toHaveLength(0);
  });
});

describe("la carga masiva", () => {
  it("marca por código y dice cuáles no encontró", async () => {
    /*
      La pantalla anunciaba "N departamentos marcados" con el tamaño de la
      lista del archivo. Un archivo con un código inexistente decía que lo
      había marcado.
    */
    const resultado = await rpc(marcela, "marcar_pagos_cuota", {
      p_cuota_id: cuotaId,
      p_codigos: ["101", "no-existe"],
    });
    expect(resultado.estado).toBe(200);
    expect(resultado.datos[0].marcadas).toBe(1);
    expect(resultado.datos[0].no_encontradas).toEqual(["no-existe"]);

    const fila = await leer(
      marcela,
      `pago_cuota?cuota_id=eq.${cuotaId}&unidad_id=eq.${UNIDAD.u101}&select=origen`,
    );
    expect(fila.datos[0].origen).toBe("carga_masiva");
  });

  it("no la hace quien no es la administración", async () => {
    const intento = await rpc(guillermo, "marcar_pagos_cuota", {
      p_cuota_id: cuotaId,
      p_codigos: ["101"],
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("lo que ve la comunidad", () => {
  it("el resumen cuenta el pago que se acaba de registrar", async () => {
    /*
      Es el otro extremo del flujo: el KT dice que quien paga a tiempo aparece
      en el Cuadro de Honor. Sin esta comprobación, registrar y contar podrían
      seguir sin hablarse, que es justo lo que pasaba.
    */
    await rpc(marcela, "marcar_pago_cuota", {
      p_cuota_id: cuotaId,
      p_unidad_id: UNIDAD.u101,
      p_pagado: true,
    });

    const resumen = await rpc(guillermo, "resumen_cuotas", {
      p_condominio_id: CONDOMINIO,
    });
    const periodo = resumen.datos.find((r: any) => r.periodo);
    expect(periodo).toBeTruthy();
    expect(periodo.al_dia).toBeGreaterThan(0);
  });

  it("y el resumen no dice qué vivienda pagó", async () => {
    // Misma garantía que la votación secreta: se expone el agregado, no las
    // filas.
    const resumen = await rpc(guillermo, "resumen_cuotas", {
      p_condominio_id: CONDOMINIO,
    });
    expect(JSON.stringify(resumen.datos)).not.toContain("unidad");
  });
});
