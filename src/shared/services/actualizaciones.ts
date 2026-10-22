/**
 * actualizaciones · las actualizaciones por el aire (OTA) del celular
 *
 * Esta es la versión **sin OTA**: la que usan la web y las pruebas (la web se
 * recarga con `AvisoDeVersionNueva`). En el celular Metro toma
 * `actualizaciones.native.ts`, con la misma forma y `expo-updates` de verdad.
 */

/** Busca una actualización y la descarga. Devuelve si quedó una nueva lista. */
export async function buscarActualizacion(): Promise<boolean> {
  return false;
}

/**
 * Si hay una actualización, la descarga y reinicia la app con ella. Para el
 * arranque y la vuelta a la app: así se ve lo nuevo a la primera, sin tener
 * que abrirla dos veces. Si no hay nada (o no hay red), no hace nada.
 */
export async function aplicarActualizacionSiHay(): Promise<void> {}

/** Reinicia la app con la actualización que ya está descargada. */
export async function reiniciarConActualizacion(): Promise<void> {}

/** Si hay una actualización descargada esperando a que se reinicie la app. */
export function useHayActualizacionLista(): boolean {
  return false;
}
