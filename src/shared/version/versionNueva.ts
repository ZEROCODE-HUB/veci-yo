/**
 * Si hay una versión publicada distinta de la que corre en esta pestaña.
 *
 * La app web no se actualiza sola: una pestaña abierta desde la mañana sigue
 * con el código de la mañana aunque se publiquen tres arreglos. El 21/10/2026
 * el tester volvió a marcar T-025 en «Falla» probando con una pestaña así,
 * después de que el arreglo ya estaba publicado.
 *
 * Solo cuenta si las dos partes saben su commit: sin eso no se molesta a nadie.
 */
export function hayVersionNueva(
  local: string,
  publicada: { commit?: unknown } | null | undefined,
): boolean {
  const remota = typeof publicada?.commit === "string" ? publicada.commit : "";
  return Boolean(local && remota && local !== remota);
}
