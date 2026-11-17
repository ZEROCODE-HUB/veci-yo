import { describe, expect, it } from "vitest";
import {
  filasDePuntualidad,
  fraccion,
  lineaDeMonto,
  lineaDeViviendas,
  porcentajeDe,
  type PuntualidadMes,
} from "./puntualidad";

const mes = (cambios: Partial<PuntualidadMes> = {}): PuntualidadMes => ({
  periodo: "2026-10-01",
  moneda: "COP",
  venceEn: "2026-10-10",
  yaVencio: true,
  viviendas: 240,
  enFecha: 180,
  conAtraso: 30,
  sinPagar: 30,
  esperado: 2_400_000,
  pagadoEnFecha: 1_800_000,
  pagadoConAtraso: 300_000,
  pendiente: 300_000,
  ...cambios,
});

describe("porcentajes de la puntualidad", () => {
  it("redondea y no divide por cero", () => {
    expect(porcentajeDe(180, 240)).toBe(75);
    expect(porcentajeDe(1, 3)).toBe(33);
    expect(porcentajeDe(5, 0)).toBe(0);
    expect(fraccion(0, 10)).toBe(0);
  });

  it("nunca pasa del 100 %", () => {
    expect(porcentajeDe(300, 240)).toBe(100);
    expect(fraccion(300, 240)).toBe(1);
  });
});

describe("las líneas que lee el vecino", () => {
  it("dice las viviendas como lo pidió el cliente", () => {
    expect(lineaDeViviendas(180, 240, "al día")).toBe("180 de 240 al día (75 %)");
  });

  it("dice el dinero con su moneda, o solo el porcentaje si no la hay", () => {
    expect(lineaDeMonto(1_800_000, 2_400_000, "COP")).toBe("1.800.000 COP (75 %)");
    expect(lineaDeMonto(50, 200, null)).toBe("25 %");
  });
});

describe("filasDePuntualidad", () => {
  it("da al día, con atraso y en mora cuando el plazo ya pasó", () => {
    const [enFecha, conAtraso, pendiente] = filasDePuntualidad(mes());
    expect(enFecha.viviendas).toBe("180 de 240 al día (75 %)");
    expect(enFecha.monto).toBe("Pagado en fecha: 1.800.000 COP (75 %)");
    expect(conAtraso.viviendas).toBe("30 de 240 pagaron con atraso (13 %)");
    expect(conAtraso.monto).toBe("Pagado en mora: 300.000 COP (13 %)");
    expect(pendiente.viviendas).toBe("30 de 240 en mora (13 %)");
    expect(pendiente.monto).toBe("Falta, en mora: 300.000 COP (13 %)");
  });

  it("antes del vencimiento lo que falta no es mora", () => {
    const pendiente = filasDePuntualidad(mes({ yaVencio: false }))[2];
    expect(pendiente.viviendas).toBe("30 de 240 todavía sin pagar (13 %)");
    expect(pendiente.monto).toBe("Falta, aún a tiempo: 300.000 COP (13 %)");
  });

  it("sin nada esperado no inventa montos", () => {
    const filas = filasDePuntualidad(mes({ esperado: 0 }));
    expect(filas.every((f) => f.monto === null)).toBe(true);
  });

  it("los trozos de la barra suman el todo", () => {
    const suma = filasDePuntualidad(mes()).reduce((total, f) => total + f.parte, 0);
    expect(suma).toBeCloseTo(1);
  });
});
