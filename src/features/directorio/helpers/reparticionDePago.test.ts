import { describe, expect, it } from "vitest";
import { textoDeReparticion } from "./reparticionDePago";

describe("textoDeReparticion", () => {
  it("dice a qué mes fue un pago que cabe en uno", () => {
    expect(
      textoDeReparticion([{ periodo: "2026-08-01", aplicado: 100_000, saldoAFavor: 0 }], "COP"),
    ).toBe("Pago registrado: cubrió agosto 2026 (100.000 COP).");
  });

  it("nombra los meses del más viejo al más nuevo y lo que queda a favor", () => {
    expect(
      textoDeReparticion(
        [
          { periodo: "2026-08-01", aplicado: 40_000, saldoAFavor: 20_000 },
          { periodo: "2026-09-01", aplicado: 100_000, saldoAFavor: 20_000 },
          { periodo: "2026-10-01", aplicado: 100_000, saldoAFavor: 20_000 },
        ],
        "COP",
      ),
    ).toBe(
      "Pago registrado: cubrió agosto 2026 (40.000 COP), septiembre 2026 (100.000 COP) y octubre 2026 (100.000 COP). Quedan 20.000 COP a favor.",
    );
  });

  it("si no debía nada, todo queda a favor", () => {
    expect(textoDeReparticion([{ periodo: null, aplicado: 0, saldoAFavor: 50_000 }], "COP")).toBe(
      "Pago registrado. No debía ningún mes. Quedan 50.000 COP a favor.",
    );
  });
});
