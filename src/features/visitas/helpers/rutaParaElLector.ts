/**
 * La ruta que entiende `expo-text-extractor` (26/10/2026).
 *
 * En Android hace `File(uri)` con lo que recibe: con «file:///data/...» busca
 * un archivo que se llama así, no lo encuentra y responde «File not found».
 * Quiere la ruta sola, con los espacios de verdad. Una `content://` la abre él.
 *
 * En iPhone es al revés (05/11/2026): recibe un `URL` de Swift y lee el
 * archivo con `Data(contentsOf:)`, así que la dirección va entera, como la da
 * la cámara.
 */
export function rutaParaElLector(uri: string, plataforma: string = "android"): string {
  if (plataforma !== "android") return uri;
  return uri.startsWith("file://") ? decodeURI(uri.slice("file://".length)) : uri;
}
