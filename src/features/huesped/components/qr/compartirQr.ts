/**
 * El QR como imagen, para compartirlo (14/10/2026).
 *
 * Depende de la plataforma y por eso vive aparte de los servicios, que tienen
 * que poder cargarse desde Node. En web se arma el PNG con `qrcode` (la misma
 * librería que dibuja el QR por dentro) y se comparte con el menú del sistema
 * si lo hay, o se descarga. En el teléfono, el PNG lo da el propio componente.
 */
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import QRCode from "qrcode";

export const PREFIJO_QR = "VECIYO:";

export async function compartirQr(
  codigo: string,
  nombre: string,
  pngBase64DelTelefono?: string,
): Promise<"compartido" | "descargado"> {
  const archivoNombre = `${nombre}.png`;

  if (Platform.OS === "web") {
    const dataUrl = await QRCode.toDataURL(`${PREFIJO_QR}${codigo}`, { width: 600, margin: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    const archivo = new globalThis.File([blob], archivoNombre, { type: "image/png" });
    const nav = globalThis.navigator as Navigator & {
      canShare?: (d: { files: globalThis.File[] }) => boolean;
    };
    if (nav?.canShare?.({ files: [archivo] })) {
      await nav.share({ files: [archivo], title: "Mi QR de entrada" });
      return "compartido";
    }
    const enlace = document.createElement("a");
    enlace.href = dataUrl;
    enlace.download = archivoNombre;
    enlace.click();
    return "descargado";
  }

  if (!pngBase64DelTelefono) throw new Error("No se pudo preparar la imagen del QR");
  const bytes = Uint8Array.from(atob(pngBase64DelTelefono), (c) => c.charCodeAt(0));
  const archivo = new File(Paths.cache, archivoNombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: "image/png" });
    return "compartido";
  }
  return "descargado";
}
