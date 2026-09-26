/**
 * De las filas de un reporte a una hoja de cálculo.
 *
 * Aquí solo vive la **forma** del Excel: los encabezados, el orden, cómo se
 * escribe cada valor y el ancho de cada columna. Escribir el archivo y
 * compartirlo es otra cosa y vive en `reportes.repo`, porque depende del
 * sistema de archivos y no se puede probar sin él.
 *
 * Separado a propósito: así lo que el cliente va a abrir en Excel —que es lo
 * que importa— se puede comprobar con pruebas normales.
 */

/** Los nombres que se leen, no los de la base. */
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

/**
 * El encabezado de una columna que nadie tradujo.
 *
 * Se deja legible en vez de dejar el nombre de la base: si mañana un reporte
 * devuelve `motivo_rechazo`, en el Excel sale «Motivo rechazo» y no una
 * columna que parece un error.
 */
export function encabezado(columna: string): string {
  const conocido = ENCABEZADOS[columna];
  if (conocido) return conocido;
  const conEspacios = columna.replace(/_/g, " ");
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
}

/**
 * Cómo se escribe cada valor en la celda.
 *
 * Las marcas de tiempo llegan en ISO con zona --`2026-09-25T14:03:00+00:00`--
 * y en una celda de Excel eso se lee fatal. Se pasan a `25/09/2026 14:03`, que
 * es como se escriben las fechas en los dos países donde esto se usa.
 *
 * Un nulo se escribe como cadena vacía y no como «null»: una celda vacía se
 * entiende sola.
 */
export function valorDeCelda(valor: unknown): string | number {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return valor;
  if (typeof valor === "boolean") return valor ? "Sí" : "No";

  const texto = String(valor);

  // `2026-09-25T14:03:00...` → fecha y hora.
  const conHora = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/,
  );
  if (conHora) {
    const [, a, m, d, hh, mm] = conHora;
    return `${d}/${m}/${a} ${hh}:${mm}`;
  }

  // `2026-09-25` → solo fecha.
  const soloFecha = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (soloFecha) {
    const [, a, m, d] = soloFecha;
    return `${d}/${m}/${a}`;
  }

  return texto;
}

export interface HojaDeReporte {
  /** La primera fila son los encabezados; el resto, los datos. */
  filas: (string | number)[][];
  /** Ancho de cada columna, en caracteres. */
  anchos: number[];
}

/**
 * La hoja entera, lista para escribir.
 *
 * El ancho de cada columna sale del contenido más largo que lleva, con un
 * mínimo y un máximo: sin esto, Excel abre todas las columnas del mismo ancho
 * y las fechas salen como `#####`.
 */
export function hojaDeReporte(
  columnas: string[],
  datos: Record<string, unknown>[],
): HojaDeReporte {
  const encabezados = columnas.map(encabezado);
  const cuerpo = datos.map((fila) =>
    columnas.map((columna) => valorDeCelda(fila[columna])),
  );

  const anchos = columnas.map((_, indice) => {
    const largos = [
      encabezados[indice].length,
      ...cuerpo.map((fila) => String(fila[indice] ?? "").length),
    ];
    return Math.min(40, Math.max(12, ...largos) + 2);
  });

  return { filas: [encabezados, ...cuerpo], anchos };
}

/**
 * El nombre del archivo.
 *
 * Lleva el tipo y el período porque quien pide tres reportes seguidos acaba
 * con tres archivos en la misma carpeta, y `reporte.xlsx` repetido no le dice
 * cuál es cuál.
 */
export function nombreDeArchivo(
  reporteId: string,
  desde?: string | null,
  hasta?: string | null,
): string {
  const limpio = reporteId.replace(/[^a-z0-9-]/gi, "-");
  if (!desde || !hasta) return `veciyo-${limpio}-historial-completo.xlsx`;
  return `veciyo-${limpio}-${desde}_a_${hasta}.xlsx`;
}
