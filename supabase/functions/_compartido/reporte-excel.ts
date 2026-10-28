/**
 * El Excel de un reporte, del lado del servidor.
 *
 * Es el mismo formato que la descarga de la aplicación
 * (`src/features/administrador/services/reporteConFormato.ts` y
 * `reporteAExcel.ts`): título, línea de contexto, encabezados con el color de
 * la marca, filas alternadas, bordes y filtro. No se importa de allí porque
 * aquello usa los alias de la aplicación (`@/shared/...`) y la función se
 * despliega sola. **Si cambia uno, cambia el otro.**
 *
 * Una diferencia, a propósito: las horas se escriben con el reloj del
 * edificio. La base las devuelve en UTC (`...+00:00`) y escribir la hora tal
 * cual pondría la entrada de las 9 de la mañana a las 14:00.
 */
import XLSX from "npm:xlsx-js-style@1.2.0";

export type IdReporte = "visitantes" | "correspondencia" | "areas-comunes";

export const TITULO: Record<IdReporte, string> = {
  visitantes: "Reporte de visitantes",
  correspondencia: "Reporte de correspondencia",
  "areas-comunes": "Reporte de zonas comunes",
};

const ENCABEZADOS: Record<string, string> = {
  fecha: "Fecha",
  zona: "Zona común",
  unidad: "Vivienda",
  horario: "Horario",
  estado: "Estado",
  participantes: "Personas",
  resuelta_por: "Resuelta por",
  registrada: "Registrada",
  empresa: "Empresa",
  categoria: "Categoría",
  destinatario: "Destinatario",
  entregada: "Entregada",
  entregada_a: "Entregada a",
  tipo: "Tipo",
  visitante: "Visitante",
  documento: "Documento",
  ingreso: "Ingreso",
  salida: "Salida",
  placas: "Placas",
  registro: "Registrada por",
};

/** Las columnas de cada reporte, en el orden de su consulta. */
export const COLUMNAS: Record<IdReporte, string[]> = {
  visitantes: ["fecha", "unidad", "tipo", "visitante", "documento", "ingreso", "salida", "placas", "registro"],
  correspondencia: ["registrada", "unidad", "empresa", "categoria", "destinatario", "estado", "entregada", "entregada_a"],
  "areas-comunes": ["fecha", "zona", "unidad", "horario", "estado", "participantes", "resuelta_por"],
};

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

const FILA_ENCABEZADOS = 3;

/** dd/MM/yyyy HH:mm en la zona del edificio. */
function fechaHora(fecha: Date, zona: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

/** Cómo se escribe cada valor en la celda. */
export function valorDeCelda(valor: unknown, zona: string): string | number {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return valor;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  const texto = String(valor);
  // Una marca de tiempo con zona: al reloj del edificio.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(texto)) {
    const fecha = new Date(texto);
    if (!Number.isNaN(fecha.getTime())) return fechaHora(fecha, zona);
  }
  const soloFecha = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  return texto;
}

const dma = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** El archivo, en base64, listo para adjuntar. */
export function excelDeReporte(datos: {
  id: IdReporte;
  filas: Record<string, unknown>[];
  condominio: string;
  desde: string;
  hasta: string;
  zona: string;
  generadoEn: Date;
}): string {
  const columnas = COLUMNAS[datos.id];
  const encabezados = columnas.map((c) => ENCABEZADOS[c] ?? c);
  const cuerpo = datos.filas.map((fila) => columnas.map((c) => valorDeCelda(fila[c], datos.zona)));
  const anchos = columnas.map((_, i) =>
    Math.min(40, Math.max(12, encabezados[i].length, ...cuerpo.map((f) => String(f[i] ?? "").length)) + 2),
  );
  const ultima = Math.max(columnas.length - 1, 0);
  const contexto = [
    `Del ${dma(datos.desde)} al ${dma(datos.hasta)}`,
    datos.condominio,
    `Generado el ${fechaHora(datos.generadoEn, datos.zona)}`,
  ].join(" · ");

  const hoja = XLSX.utils.aoa_to_sheet([
    [TITULO[datos.id]],
    [contexto],
    [],
    encabezados,
    ...(cuerpo.length ? cuerpo : [["Sin registros en este período."]]),
  ]);

  const estilo = (r: number, c: number, s: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    hoja[ref] = hoja[ref] ?? { t: "s", v: "" };
    hoja[ref].s = s;
  };
  estilo(0, 0, { font: { bold: true, sz: 16, color: { rgb: COLOR.cabecera } } });
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
        ...(i % 2 === 1 ? { fill: { patternType: "solid", fgColor: { rgb: COLOR.banda } } } : {}),
      }),
    ),
  );

  hoja["!cols"] = anchos.map((wch) => ({ wch }));
  hoja["!rows"] = [{ hpt: 26 }, { hpt: 16 }, { hpt: 8 }, { hpt: 22 }];
  hoja["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: ultima } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: ultima } },
  ];
  if (cuerpo.length) {
    hoja["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: FILA_ENCABEZADOS, c: 0 },
        e: { r: FILA_ENCABEZADOS + cuerpo.length, c: ultima },
      }),
    };
  }

  const libro = XLSX.utils.book_new();
  const nombre = TITULO[datos.id].replace(/^Reporte de /, "");
  XLSX.utils.book_append_sheet(libro, hoja, (nombre.charAt(0).toUpperCase() + nombre.slice(1)).slice(0, 31));
  return XLSX.write(libro, { type: "base64", bookType: "xlsx" }) as string;
}

/** Como la descarga: el tipo y el período en el nombre. */
export const nombreDeArchivo = (id: IdReporte, desde: string, hasta: string) =>
  `veciyo-${id}-${desde}_a_${hasta}.xlsx`;
