import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  encabezado,
  hojaDeReporte,
  nombreDeArchivo,
  valorDeCelda,
} from "./reporteAExcel";

/**
 * Lo que el administrador va a abrir en Excel.
 *
 * El archivo en sí no se puede probar aquí --escribirlo pasa por el sistema de
 * archivos y compartirlo por el diálogo del sistema-- pero **su contenido
 * sí**, que es lo que de verdad importa: si una fecha sale como
 * `2026-09-25T14:03:00+00:00` o una columna se llama `entregada_a`, el reporte
 * es igual de ilegible aunque el archivo se genere perfectamente.
 *
 * Por eso la forma de la hoja vive en un módulo sin dependencias.
 */
describe("los encabezados", () => {
  it("son los que se leen, no los de la base", () => {
    expect(encabezado("entregada_a")).toBe("Entregada a");
    expect(encabezado("resuelta_por")).toBe("Resuelta por");
    expect(encabezado("unidad")).toBe("Vivienda");
  });

  it("y una columna nueva sale legible, no con su nombre técnico", () => {
    /*
      El control que evita que un reporte futuro salga con «motivo_rechazo» de
      encabezado: no hace falta acordarse de añadirlo a la lista para que se
      lea bien.
    */
    expect(encabezado("motivo_rechazo")).toBe("Motivo rechazo");
  });
});

describe("los valores de las celdas", () => {
  it("las marcas de tiempo se leen como fecha y hora", () => {
    // Llegan en ISO con zona; en una celda eso es ilegible.
    expect(valorDeCelda("2026-09-25T14:03:00+00:00")).toBe("25/09/2026 14:03");
  });

  it("y una fecha sin hora, como fecha", () => {
    expect(valorDeCelda("2026-09-25")).toBe("25/09/2026");
  });

  it("un vacío es una celda vacía, no la palabra «null»", () => {
    expect(valorDeCelda(null)).toBe("");
    expect(valorDeCelda(undefined)).toBe("");
  });

  it("los números siguen siendo números, para poder sumarlos", () => {
    // Si salieran como texto, Excel no los sumaría y la columna «Personas»
    // no serviría para nada.
    expect(valorDeCelda(4)).toBe(4);
    expect(typeof valorDeCelda(4)).toBe("number");
  });

  it("y un sí o no se escribe con palabras", () => {
    expect(valorDeCelda(true)).toBe("Sí");
    expect(valorDeCelda(false)).toBe("No");
  });

  it("el texto normal no se toca", () => {
    expect(valorDeCelda("Torre 1 · 102")).toBe("Torre 1 · 102");
  });
});

describe("la hoja entera", () => {
  const COLUMNAS = ["fecha", "unidad", "visitante", "participantes"];
  const DATOS = [
    {
      fecha: "2026-09-25",
      unidad: "102",
      visitante: "Camila Restrepo Ávila",
      participantes: 3,
    },
    { fecha: "2026-09-26", unidad: "205", visitante: null, participantes: 0 },
  ];

  it("empieza por los encabezados y sigue con los datos", () => {
    const { filas } = hojaDeReporte(COLUMNAS, DATOS);

    expect(filas).toHaveLength(3);
    expect(filas[0]).toEqual(["Fecha", "Vivienda", "Visitante", "Personas"]);
    expect(filas[1]).toEqual(["25/09/2026", "102", "Camila Restrepo Ávila", 3]);
    expect(filas[2]).toEqual(["26/09/2026", "205", "", 0]);
  });

  it("y el ancho de cada columna sale de lo que lleva dentro", () => {
    /*
      Sin esto Excel abre todas las columnas igual de anchas y las fechas
      salen como `#####`. El nombre largo manda sobre el encabezado corto.
    */
    const { anchos } = hojaDeReporte(COLUMNAS, DATOS);

    expect(anchos).toHaveLength(4);
    // «Camila Restrepo Ávila» son 21 caracteres: la columna es más ancha que
    // su encabezado, que son 9.
    expect(anchos[2]).toBeGreaterThan(anchos[3]);
    // Y ninguna se desborda.
    expect(Math.max(...anchos)).toBeLessThanOrEqual(40);
  });

  it("un reporte sin resultados sale con sus encabezados igual", () => {
    // Una hoja vacía del todo no dice si el reporte falló o si no hubo nada.
    const { filas } = hojaDeReporte(COLUMNAS, []);

    expect(filas).toHaveLength(1);
    expect(filas[0][0]).toBe("Fecha");
  });
});

describe("el nombre del archivo", () => {
  it("dice qué reporte es y de qué período", () => {
    // Quien pide tres reportes seguidos acaba con tres archivos en la misma
    // carpeta; `reporte.xlsx` repetido no le dice cuál es cuál.
    expect(nombreDeArchivo("visitantes", "2026-09-01", "2026-09-30")).toBe(
      "veciyo-visitantes-2026-09-01_a_2026-09-30.xlsx",
    );
  });

  it("y lo dice también cuando es el historial completo", () => {
    expect(nombreDeArchivo("areas-comunes", null, null)).toBe(
      "veciyo-areas-comunes-historial-completo.xlsx",
    );
  });
});

describe("el archivo que sale", () => {
  /*
    Lo anterior comprueba la FORMA de la hoja. Esto comprueba que esa forma
    produce un `.xlsx` de verdad: se escribe, se vuelve a leer con otra
    instancia, y se mira que los datos estén donde tienen que estar.

    Sin esto, un cambio en cómo se arma el libro --el nombre de la hoja, los
    anchos, el tipo de escritura-- podría dar un archivo que Excel no abre, y
    las pruebas de arriba seguirían todas en verde.
  */
  const libroDe = (columnas: string[], datos: Record<string, unknown>[]) => {
    const { filas, anchos } = hojaDeReporte(columnas, datos);
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja["!cols"] = anchos.map((ancho) => ({ wch: ancho }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte");
    return XLSX.write(libro, { type: "buffer", bookType: "xlsx" });
  };

  it("es un xlsx que se puede volver a abrir", () => {
    const bytes = libroDe(
      ["fecha", "unidad", "visitante", "ingreso"],
      [
        {
          fecha: "2026-09-25",
          unidad: "102",
          visitante: "Camila Restrepo Ávila",
          ingreso: "2026-09-25T14:03:00+00:00",
        },
      ],
    );

    // Un .xlsx es un zip: empieza por «PK».
    expect(Buffer.from(bytes).subarray(0, 2).toString()).toBe("PK");

    const releido = XLSX.read(bytes, { type: "buffer" });
    expect(releido.SheetNames).toContain("Reporte");
  });

  it("y dentro están los encabezados en español y los datos formateados", () => {
    const bytes = libroDe(
      ["fecha", "unidad", "visitante", "ingreso"],
      [
        {
          fecha: "2026-09-25",
          unidad: "102",
          visitante: "Camila Restrepo Ávila",
          ingreso: "2026-09-25T14:03:00+00:00",
        },
      ],
    );

    const releido = XLSX.read(bytes, { type: "buffer" });
    const celdas = XLSX.utils.sheet_to_json<(string | number)[]>(
      releido.Sheets.Reporte,
      { header: 1 },
    );

    expect(celdas[0]).toEqual(["Fecha", "Vivienda", "Visitante", "Ingreso"]);
    expect(celdas[1]).toEqual([
      "25/09/2026",
      "102",
      "Camila Restrepo Ávila",
      "25/09/2026 14:03",
    ]);
  });

  it("y los números siguen siendo números al releerlos", () => {
    // Si se hubieran escrito como texto, la columna no se podría sumar en
    // Excel y el reporte de aforo no serviría para nada.
    const bytes = libroDe(["participantes"], [{ participantes: 4 }]);
    const releido = XLSX.read(bytes, { type: "buffer" });

    expect(releido.Sheets.Reporte.A2.v).toBe(4);
    expect(releido.Sheets.Reporte.A2.t).toBe("n");
  });
});
