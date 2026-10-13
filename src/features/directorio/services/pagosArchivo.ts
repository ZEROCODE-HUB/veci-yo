/**
 * La hoja de pagos, leída del archivo que elige la administración.
 *
 * Va aparte de `cuotas.repo` por lo mismo que `reporteArchivo`: leer un
 * archivo depende del dispositivo, y el repositorio tiene que poder cargarse
 * desde Node, que es donde corren los recorridos.
 *
 * Se lee con la misma librería que escribe los reportes, así que entiende
 * `.xlsx`, `.xls` y `.csv` --con coma o con punto y coma--. Antes se leía como
 * texto, y un Excel de verdad no daba ni un código.
 */
import * as XLSX from "xlsx";
import { codigosDeHoja } from "../helpers/codigosDePago";

export async function codigosDeArchivo(
  uri: string,
  codigosConocidos: string[],
): Promise<string[]> {
  const contenido = await (await fetch(uri)).arrayBuffer();
  // `raw` deja el texto de un CSV como viene: sin él, «0101» pasa a ser 101.
  const libro = XLSX.read(new Uint8Array(contenido), {
    type: "array",
    raw: true,
  });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) return [];

  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    raw: false,
    defval: "",
  });
  return codigosDeHoja(filas, codigosConocidos);
}
