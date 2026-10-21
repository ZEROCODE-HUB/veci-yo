/**
 * La hoja del reporte, con su presentación.
 *
 * El cliente pidió el 20/10/2026 «mejorar visualmente el excel»: salía una
 * tabla pelada, sin título y con los encabezados iguales que los datos. Ahora
 * lleva arriba qué reporte es, de qué edificio y de qué período; encabezados
 * con el color de la marca; filas alternadas; bordes finos y un filtro en cada
 * columna.
 *
 * La librería de siempre (`xlsx`) no escribe estilos en su versión libre: esta
 * es la misma con estilos (`xlsx-js-style`). No depende del dispositivo, así
 * que se prueba con pruebas normales; escribir y compartir el archivo sigue en
 * `reporteArchivo`.
 */
import * as XLSX from "xlsx-js-style";
import { formatDateTime } from "@/shared/utils";
import { hojaDeReporte, valorDeCelda } from "./reporteAExcel";

/** Lo que va arriba de la tabla. */
export interface CabeceraDeReporte {
  reporteId: string;
  condominio: string;
  desde?: string | null;
  hasta?: string | null;
  generadoEn: Date;
}

const TITULO: Record<string, string> = {
  visitantes: "Reporte de visitantes",
  correspondencia: "Reporte de correspondencia",
  "areas-comunes": "Reporte de zonas comunes",
};

// Los de la marca, los mismos que el GSheet del proyecto.
const COLOR = {
  cabecera: "1F2A44",
  cabeceraTexto: "FFFFFF",
  marca: "F5B800",
  banda: "F7F7F5",
  borde: "D9D9D9",
  gris: "6B7280",
};

const borde = {
  top: { style: "thin", color: { rgb: COLOR.borde } },
  bottom: { style: "thin", color: { rgb: COLOR.borde } },
  left: { style: "thin", color: { rgb: COLOR.borde } },
  right: { style: "thin", color: { rgb: COLOR.borde } },
};

/** La fila (contando desde 0) donde empiezan los encabezados. */
export const FILA_ENCABEZADOS = 3;

export function tituloDeReporte(reporteId: string): string {
  return TITULO[reporteId] ?? "Reporte";
}

/** «Del 01/10/2026 al 20/10/2026 · Las Barranqueras 246 · Generado el …». */
export function lineaDeContexto(c: CabeceraDeReporte): string {
  const periodo =
    c.desde && c.hasta
      ? `Del ${valorDeCelda(c.desde)} al ${valorDeCelda(c.hasta)}`
      : "Todo el historial";
  const partes = [periodo, c.condominio, `Generado el ${formatDateTime(c.generadoEn)}`];
  return partes.filter(Boolean).join(" · ");
}

export function hojaConFormato(
  columnas: string[],
  datos: Record<string, unknown>[],
  cabecera: CabeceraDeReporte,
): XLSX.WorkSheet {
  const { filas, anchos } = hojaDeReporte(columnas, datos);
  const [encabezados, ...cuerpo] = filas;
  const ultimaColumna = Math.max(columnas.length - 1, 0);

  const hoja = XLSX.utils.aoa_to_sheet([
    [tituloDeReporte(cabecera.reporteId)],
    [lineaDeContexto(cabecera)],
    [],
    encabezados,
    ...cuerpo,
  ]);

  const estilo = (fila: number, columna: number, s: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r: fila, c: columna });
    hoja[ref] = hoja[ref] ?? { t: "s", v: "" };
    hoja[ref].s = s;
  };

  estilo(0, 0, {
    font: { bold: true, sz: 16, color: { rgb: COLOR.cabecera } },
  });
  estilo(1, 0, { font: { sz: 10, color: { rgb: COLOR.gris } } });

  encabezados.forEach((_, c) =>
    estilo(FILA_ENCABEZADOS, c, {
      font: { bold: true, color: { rgb: COLOR.cabeceraTexto } },
      fill: { patternType: "solid", fgColor: { rgb: COLOR.cabecera } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { ...borde, bottom: { style: "medium", color: { rgb: COLOR.marca } } },
    }),
  );

  cuerpo.forEach((fila, i) =>
    fila.forEach((_, c) =>
      estilo(FILA_ENCABEZADOS + 1 + i, c, {
        border: borde,
        alignment: { vertical: "top", wrapText: true },
        ...(i % 2 === 1
          ? { fill: { patternType: "solid", fgColor: { rgb: COLOR.banda } } }
          : {}),
      }),
    ),
  );

  hoja["!cols"] = anchos.map((ancho) => ({ wch: ancho }));
  hoja["!rows"] = [{ hpt: 26 }, { hpt: 16 }, { hpt: 8 }, { hpt: 22 }];
  // El título y el contexto ocupan todo el ancho de la tabla.
  hoja["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaColumna } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaColumna } },
  ];
  // Un filtro en cada encabezado: es lo primero que se hace con un reporte.
  hoja["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: FILA_ENCABEZADOS, c: 0 },
      e: { r: FILA_ENCABEZADOS + cuerpo.length, c: ultimaColumna },
    }),
  };

  return hoja;
}

/** El libro entero, con la hoja nombrada como el reporte. */
export function libroDeReporte(
  columnas: string[],
  datos: Record<string, unknown>[],
  cabecera: CabeceraDeReporte,
): XLSX.WorkBook {
  const libro = XLSX.utils.book_new();
  // Excel no admite más de 31 caracteres en el nombre de una hoja.
  const nombre = tituloDeReporte(cabecera.reporteId).replace(/^Reporte de /, "");
  XLSX.utils.book_append_sheet(
    libro,
    hojaConFormato(columnas, datos, cabecera),
    (nombre.charAt(0).toUpperCase() + nombre.slice(1)).slice(0, 31),
  );
  return libro;
}

export { XLSX };
