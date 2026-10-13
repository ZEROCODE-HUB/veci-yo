import { describe, expect, it } from "vitest";
import { LUNES_A_VIERNES, textoDeDias, tocaEseDia } from "./diasDeTrabajo";

describe("textoDeDias", () => {
  it("un tramo seguido se lee como rango", () => {
    expect(textoDeDias(LUNES_A_VIERNES)).toBe("Lun a Vie");
    expect(textoDeDias([6, 0, 5])).toBe("Vie a Dom");
  });

  it("días sueltos se enumeran, en orden de semana y no en el que llegan", () => {
    expect(textoDeDias([5, 1, 3])).toBe("Lun, Mié y Vie");
    expect(textoDeDias([2, 1])).toBe("Lun y Mar");
    expect(textoDeDias([0])).toBe("Dom");
  });

  it("los siete son todos los días", () => {
    expect(textoDeDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todos los días");
  });

  it("sin días no inventa una semana laboral", () => {
    expect(textoDeDias([])).toBe("Sin días asignados");
    expect(textoDeDias(null)).toBe("Sin días asignados");
    expect(textoDeDias(undefined)).toBe("Sin días asignados");
  });
});

describe("tocaEseDia", () => {
  // 12/10/2026 es lunes; 18/10/2026, domingo.
  const lunes = new Date(2026, 9, 12);
  const domingo = new Date(2026, 9, 18);

  it("dice si ese día es de los suyos", () => {
    expect(tocaEseDia(LUNES_A_VIERNES, lunes)).toBe(true);
    expect(tocaEseDia(LUNES_A_VIERNES, domingo)).toBe(false);
    expect(tocaEseDia([0], domingo)).toBe(true);
  });

  it("sin días decididos no avisa de nada", () => {
    expect(tocaEseDia(null, domingo)).toBe(true);
    expect(tocaEseDia([], domingo)).toBe(true);
  });
});
