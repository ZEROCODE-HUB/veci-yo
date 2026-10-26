/**
 * La ruta que entiende `expo-text-extractor` en Android (26/10/2026).
 *
 * Hace `File(uri)` con lo que recibe: con «file:///data/...» busca un archivo
 * que se llama así, no lo encuentra y responde «File not found». Quiere la
 * ruta sola, con los espacios de verdad. Una `content://` la abre él.
 */
export function rutaParaElLector(uri: string): string {
  return uri.startsWith("file://") ? decodeURI(uri.slice("file://".length)) : uri;
}
