/**
 * Abrir el archivo del reglamento en el celular (17/11/2026).
 *
 * Va aparte de `reglamentos.repo` por lo mismo que `reporteArchivo`: depende
 * del dispositivo, y el repositorio tiene que poder cargarse desde Node, que
 * es donde corren los recorridos.
 *
 * Antes se mandaba la URL firmada a `Linking.openURL`. En Android eso abre el
 * navegador, que no pinta un PDF ni un Word: lo descarga sin decir nada, y la
 * persona se queda mirando una pestaña en blanco. Ahora se descarga a la
 * caché con su nombre y su tipo, y se ofrece al sistema: en Android sale la
 * lista de aplicaciones que saben abrirlo (el visor de PDF, Word, Drive) y en
 * iOS la hoja de compartir con la vista previa. Todo con piezas que la app ya
 * tiene (`expo-file-system`, `expo-sharing`): nada nativo nuevo.
 *
 * Y aun así no se veía (18/11/2026): la hoja de compartir de Android ofrece
 * WhatsApp o Gmail, no un visor, y la de iPhone solo una miniatura. Ahora el
 * documento se ABRE en una ventana de navegador dentro de la app
 * (`expo-web-browser`, que la app ya tiene):
 *   · iPhone: la ventana de Safari pinta el PDF y el Word tal cual.
 *   · Android: el navegador no pinta un PDF (lo descarga), así que se abre
 *     con el visor de documentos de Google, que sí lo pinta. Recibe la URL
 *     temporal del archivo, que caduca sola.
 * Si la ventana no se puede abrir, queda el camino de antes (compartir).
 */
import { Linking, Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { nombreParaGuardar, tipoDeDocumento } from "../helpers/archivoDelReglamento";

export async function abrirArchivoDelReglamento(params: {
  /** URL firmada: el depósito es privado. */
  url: string;
  /** Ruta en el depósito: de ahí sale el tipo. */
  ruta: string;
  /** El nombre con que se subió, si se guardó. */
  nombre?: string | null;
}): Promise<void> {
  // La versión web es solo demostración: el navegador sabe qué hacer.
  if (Platform.OS === "web") {
    await Linking.openURL(params.url);
    return;
  }

  try {
    const direccion =
      Platform.OS === "android"
        ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(params.url)}`
        : params.url;
    await WebBrowser.openBrowserAsync(direccion, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
    return;
  } catch {
    // Sin ventana de navegador: se ofrece al sistema, como antes.
  }

  if (!(await Sharing.isAvailableAsync())) {
    await Linking.openURL(params.url);
    return;
  }

  const tipo = tipoDeDocumento(params.ruta);
  const destino = new File(Paths.cache, nombreParaGuardar(params.ruta, params.nombre));
  // Uno anterior con el mismo nombre puede ser otra versión del reglamento.
  if (destino.exists) destino.delete();
  const archivo = await File.downloadFileAsync(params.url, destino);

  await Sharing.shareAsync(archivo.uri, {
    mimeType: tipo.mime,
    UTI: tipo.uti,
    dialogTitle: "Abrir el reglamento con…",
  });
}
