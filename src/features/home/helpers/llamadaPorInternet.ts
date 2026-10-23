/**
 * Si la llamada de la pantalla «Llamar» sale por internet, dentro de la app, o
 * por el marcador del teléfono (23/10/2026).
 *
 * Por internet hay dos caminos y nada más (`llamar_por_internet` en la base):
 * una vivienda llama a la portería de su edificio, y la portería llama a una
 * vivienda. La administración no tiene llamada por internet, ni para recibir
 * ni para hacer, así que con ella se usa el teléfono.
 */
export function llamadaPorInternet(datos: {
  rolActivo: string | null;
  /** Lo elegido por un vecino: `porteria:<id>` o `administracion`. */
  destino: string;
  /** La vivienda elegida por el personal. */
  unidadId: string;
  /** La vivienda desde la que llama un vecino. */
  unidadActivaId: string | null | undefined;
}): boolean {
  const { rolActivo, destino, unidadId, unidadActivaId } = datos;
  if (rolActivo === "guardia") return Boolean(unidadId);
  if (rolActivo === "administrador") return false;
  return destino.startsWith("porteria:") && Boolean(unidadActivaId);
}
