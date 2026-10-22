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

/** Reinicia la app con la actualización que ya está descargada. */
export async function reiniciarConActualizacion(): Promise<void> {}

/** Si hay una actualización descargada esperando a que se reinicie la app. */
export function useHayActualizacionLista(): boolean {
  return false;
}
