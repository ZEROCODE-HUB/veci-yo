/**
 * El reporte, como archivo en el dispositivo.
 *
 * Vive aparte de `reportes.repo` a la fuerza: escribir un archivo depende de la
 * plataforma --`react-native`, `expo-file-system`, `expo-sharing`-- y el
 * repositorio de datos tiene que poder cargarse desde Node, que es donde corren
 * los recorridos. Al meter esto ahi, `administracion-reporte.test.ts` dejo de
 * arrancar: el import arrastraba React Native entero y el parser de Node lo
 * rechaza --«Flow is not supported»--. La suite lo dijo en un fallo de parseo,
 * no en una prueba roja.
 *
 * La **forma** de la hoja --encabezados, valores, anchos-- esta en
 * `reporteAExcel`, que no depende de nada y si se puede probar.
 */
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { hojaDeReporte, nombreDeArchivo } from "./reporteAExcel";
import type { ResultadoReporte, SolicitudReporte } from "./reportes.repo";

/**
 * El reporte, como archivo de Excel.
 *
 * La pantalla decía cuántos registros había y ahí se acababa: ninguna forma de
 * leerlos (R-33). El texto lo atribuía al proveedor de correo, y ahí había dos
 * cosas mezcladas — un archivo se genera sin depender de nadie.
 *
 * Devuelve dónde quedó el archivo. En móvil se guarda y se ofrece compartir;
 * en web se descarga, que es lo que allí significa «guardar».
 */
export async function reporteAArchivo(
  solicitud: SolicitudReporte,
  resultado: ResultadoReporte,
): Promise<{ nombre: string; compartido: boolean }> {
  const { filas, anchos } = hojaDeReporte(
    resultado.columnas,
    resultado.filas,
  );
  const nombre = nombreDeArchivo(
    solicitud.reporteId,
    solicitud.todoHistorial ? null : solicitud.desde,
    solicitud.todoHistorial ? null : solicitud.hasta,
  );

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja["!cols"] = anchos.map((ancho) => ({ wch: ancho }));
  // La fila de encabezados se queda fija al desplazarse: un reporte de
  // trescientas filas sin esto obliga a subir para saber qué columna es cuál.
  hoja["!freeze"] = { xSplit: "0", ySplit: "1" };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Reporte");

  if (Platform.OS === "web") {
    /*
      La descarga a mano, no `XLSX.writeFile`: esa function busca el sistema de
      archivos de Node y en el navegador no hace nada --se quedaba colgada--.
      Un Blob y un enlace es lo que de verdad descarga un archivo en web.
    */
    const datos = XLSX.write(libro, { type: "array", bookType: "xlsx" });
    const blob = new Blob([datos], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    // Se suelta el objeto: sin esto el archivo se queda en memoria hasta que
    // se cierre la pestaña, y un reporte grande no es pequeño.
    URL.revokeObjectURL(url);
    return { nombre, compartido: false };
  }

  /*
    Los bytes directos, no base64: `expo-file-system` 57 estrenó una API nueva
    --`File` y `Paths`-- y su `write` acepta un `Uint8Array`. La API vieja
    --`cacheDirectory`, `writeAsStringAsync`-- sigue existiendo bajo
    `expo-file-system/legacy`, pero escribir bytes por una cadena base64 es
    una vuelta de más para un archivo que ya son bytes.
  */
  const bytes = XLSX.write(libro, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;

  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(new Uint8Array(bytes));
  const destino = archivo.uri;

  /*
    Se guarda en la cache y se ofrece compartir, en vez de dejarlo en un sitio
    fijo: en iOS no hay «carpeta de descargas» a la que el usuario llegue solo,
    y compartir es el camino por el que el archivo acaba donde él quiera
    --correo, Drive, Archivos--.
  */
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destino, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Guardar o enviar el reporte",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
    return { nombre, compartido: true };
  }

  return { nombre, compartido: false };
}
