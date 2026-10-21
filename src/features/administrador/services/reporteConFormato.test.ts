import { describe, expect, it } from "vitest";
import {
  FILA_ENCABEZADOS,
  hojaConFormato,
  libroDeReporte,
  lineaDeContexto,
  XLSX,
} from "./reporteConFormato";

/**
 * El Excel del reporte con su presentación (pedido el 20/10/2026). Lo que se
 * comprueba es lo que ve quien lo abre: el título, de qué período es, que los
 * encabezados se distinguen y que hay filtro.
 */
const cabecera = {
  reporteId: "visitantes",
  condominio: "Las Barranqueras 246",
  desde: "2026-10-01",
  hasta: "2026-10-20",
  generadoEn: new Date(2026, 9, 20, 18, 5),
};
const columnas = ["fecha", "visitante", "unidad"];
const datos = [
  { fecha: "2026-10-02", visitante: "Ana", unidad: "102" },
  { fecha: "2026-10-03", visitante: "Luis", unidad: "205" },
];

describe("el Excel del reporte con formato", () => {
  it("arriba dice qué reporte es, de qué edificio y de qué período", () => {
    const hoja = hojaConFormato(columnas, datos, cabecera);

    expect(hoja.A1.v).toBe("Reporte de visitantes");
    expect(hoja.A2.v).toBe(
      "Del 01/10/2026 al 20/10/2026 · Las Barranqueras 246 · Generado el 20/10/2026 18:05",
    );
  });

  it("sin rango dice que es todo el historial", () => {
    expect(lineaDeContexto({ ...cabecera, desde: null, hasta: null })).toMatch(
      /^Todo el historial · /,
    );
  });

  it("los encabezados van en negrita sobre el color de la marca", () => {
    const hoja = hojaConFormato(columnas, datos, cabecera);
    const ref = XLSX.utils.encode_cell({ r: FILA_ENCABEZADOS, c: 0 });

    expect(hoja[ref].v).toBe("Fecha");
    expect(hoja[ref].s.font.bold).toBe(true);
    expect(hoja[ref].s.fill.fgColor.rgb).toBe("1F2A44");
  });

  it("las filas de datos se alternan y llevan los valores ya escritos", () => {
    const hoja = hojaConFormato(columnas, datos, cabecera);
    const primera = XLSX.utils.encode_cell({ r: FILA_ENCABEZADOS + 1, c: 0 });
    const segunda = XLSX.utils.encode_cell({ r: FILA_ENCABEZADOS + 2, c: 0 });

    expect(hoja[primera].v).toBe("02/10/2026");
    expect(hoja[primera].s.fill).toBeUndefined();
    expect(hoja[segunda].s.fill.fgColor.rgb).toBe("F7F7F5");
  });

  it("hay un filtro sobre toda la tabla", () => {
    const hoja = hojaConFormato(columnas, datos, cabecera);

    expect(hoja["!autofilter"]?.ref).toBe("A4:C6");
  });

  it("el estilo sobrevive a escribir el archivo y volver a leerlo", () => {
    const libro = libroDeReporte(columnas, datos, cabecera);
    const bytes = XLSX.write(libro, { type: "array", bookType: "xlsx" });
    const leido = XLSX.read(bytes, { type: "array", cellStyles: true });
    const hoja = leido.Sheets[leido.SheetNames[0]];

    expect(leido.SheetNames[0]).toBe("Visitantes");
    expect(hoja.A1.v).toBe("Reporte de visitantes");
    expect(hoja.A4.s?.fgColor?.rgb ?? hoja.A4.s?.fill?.fgColor?.rgb).toBe("1F2A44");
  });
});
