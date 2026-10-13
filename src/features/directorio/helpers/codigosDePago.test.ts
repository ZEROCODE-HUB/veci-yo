import { describe, expect, it } from "vitest";
import { codigosDeHoja, codigosDeTexto } from "./codigosDePago";

describe("codigosDeHoja", () => {
  it("toma la columna cuyo encabezado dice que es la vivienda", () => {
    expect(
      codigosDeHoja([
        ["Nombre", "Depto", "Importe"],
        ["Ana Gómez", "101", "350000"],
        ["Luis Pérez", "102", "350000"],
      ]),
    ).toEqual(["101", "102"]);
  });

  it("sin encabezado, toma la columna que coincide con las viviendas que existen", () => {
    expect(
      codigosDeHoja(
        [
          ["Ana Gómez", "350000", "101"],
          ["Luis Pérez", "350000", "506 C"],
        ],
        ["101", "102", "506 C"],
      ),
    ).toEqual(["101", "506 C"]);
  });

  it("sin encabezado y sin coincidencias, toma la primera columna", () => {
    expect(
      codigosDeHoja([
        ["901", "Ana"],
        ["902", "Luis"],
      ]),
    ).toEqual(["901", "902"]);
  });

  it("no da por código ni el nombre ni el importe", () => {
    const codigos = codigosDeHoja(
      [
        ["101", "Ana Gómez", "350000"],
        ["102", "Luis Pérez", "350000"],
      ],
      ["101", "102"],
    );
    expect(codigos).not.toContain("Ana Gómez");
    expect(codigos).not.toContain("350000");
    expect(codigos).toEqual(["101", "102"]);
  });

  it("quita repetidos y filas vacías, y lee un número como su texto", () => {
    expect(
      codigosDeHoja([["Unidad"], [101], [""], ["101"], [null], [" 102 "]]),
    ).toEqual(["101", "102"]);
  });

  it("una hoja vacía no trae nada", () => {
    expect(codigosDeHoja([])).toEqual([]);
    expect(codigosDeHoja([["", null]])).toEqual([]);
  });
});

describe("codigosDeTexto", () => {
  it("separa por coma, punto y coma o salto de línea", () => {
    expect(codigosDeTexto("101, 102;201\n506 C\n\n101")).toEqual([
      "101",
      "102",
      "201",
      "506 C",
    ]);
  });
});
