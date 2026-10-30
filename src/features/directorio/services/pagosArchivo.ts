/**
 * La hoja de pagos: la plantilla que se descarga y el archivo que se sube.
 *
 * Va aparte de `cuotas.repo` por lo mismo que `reporteArchivo`: leer y
 * escribir un archivo depende del dispositivo, y el repositorio tiene que
 * poder cargarse desde Node, que es donde corren los recorridos.
 *
 * Desde el 30/10/2026 (Para Claude 189) la carga masiva va con plantilla: se
 * descarga un Excel con cada departamento --código, nombre, importe mensual,
 * importes variables y una columna vacía para el monto pagado--, se rellena y
 * se sube. Ya no se escriben los códigos a mano.
 */
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

export const COLUMNA_CODIGO = "Código";
export const COLUMNA_PAGADO = "Monto pagado";

export interface FilaDePlantilla {
  codigo: string;
  nombre: string;
  mensual: number;
  variables: number[];
  total: number;
  yaPagado: number;
}

export interface FilaLeida {
  codigo: string;
  monto: string;
}

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Descarga (web) o comparte (celular) la plantilla del mes. */
export async function descargarPlantillaDePagos(
  filas: FilaDePlantilla[],
  nombreDelMes: string,
): Promise<{ nombre: string }> {
  const hoja = XLSX.utils.aoa_to_sheet([
    [
      COLUMNA_CODIGO,
      "Nombre",
      "Importe mensual",
      "Importes variables",
      "Total del mes",
      "Ya pagado",
      COLUMNA_PAGADO,
    ],
    ...filas.map((f) => [
      f.codigo,
      f.nombre,
      f.mensual,
      f.variables.join(" + "),
      f.total,
      f.yaPagado,
      "",
    ]),
  ]);
  hoja["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Pagos");
  const nombre = `pagos-${nombreDelMes.replace(/\s+/g, "-").toLowerCase()}.xlsx`;

  if (Platform.OS === "web") {
    const datos = XLSX.write(libro, { type: "array", bookType: "xlsx" });
    const url = URL.createObjectURL(new Blob([datos], { type: MIME }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
    return { nombre };
  }

  const bytes = XLSX.write(libro, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(new Uint8Array(bytes));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, {
      mimeType: MIME,
      dialogTitle: "Guardar o enviar la plantilla de pagos",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  }
  return { nombre };
}

/**
 * Lee la plantilla rellenada: el código y el monto pagado de cada fila. Busca
 * las dos columnas por su título, así que se pueden mover; sin ellas, falla
 * diciendo cuál falta.
 */
export async function filasDeArchivo(uri: string): Promise<FilaLeida[]> {
  const contenido = await (await fetch(uri)).arrayBuffer();
  const libro = XLSX.read(new Uint8Array(contenido), { type: "array", raw: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) return [];
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: false, defval: "" });
  const normal = (v: unknown) =>
    String(v ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim()
      .toLowerCase();
  const encabezado = filas.findIndex((f) => f.some((c) => normal(c) === normal(COLUMNA_CODIGO)));
  if (encabezado < 0) throw new Error(`Al archivo le falta la columna «${COLUMNA_CODIGO}».`);
  const titulos = filas[encabezado].map(normal);
  const iCodigo = titulos.indexOf(normal(COLUMNA_CODIGO));
  const iPagado = titulos.indexOf(normal(COLUMNA_PAGADO));
  if (iPagado < 0) throw new Error(`Al archivo le falta la columna «${COLUMNA_PAGADO}».`);
  return filas
    .slice(encabezado + 1)
    .map((f) => ({
      codigo: String(f[iCodigo] ?? "").trim(),
      // Sin separador de miles: «1.500.000» o «1,500,000» son un millón y medio.
      monto: String(f[iPagado] ?? "")
        .trim()
        .replace(/[^\d.,-]/g, "")
        .replace(/[.,](?=\d{3}(\D|$))/g, "")
        .replace(",", "."),
    }))
    .filter((f) => f.codigo && f.monto);
}
