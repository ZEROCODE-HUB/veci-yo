/**
 * actualizaciones · las actualizaciones por el aire (OTA) del celular
 *
 * Misma forma que `actualizaciones.ts` (la de la web y las pruebas). La app ya
 * busca una actualización al abrirse y la aplica la vez siguiente; esto es para
 * no esperar: cuando llega el aviso «Veciyo se actualizó» o se vuelve a la app,
 * se descarga, y `AvisoDeVersionNueva` ofrece reiniciar.
 *
 * En desarrollo (Expo en local) `expo-updates` está apagado: todo responde
 * «no hay nada» en vez de fallar.
 */
import * as Updates from "expo-updates";

export async function buscarActualizacion(): Promise<boolean> {
  if (!Updates.isEnabled) return false;
  const { isAvailable } = await Updates.checkForUpdateAsync();
  if (!isAvailable) return false;
  const { isNew } = await Updates.fetchUpdateAsync();
  return isNew;
}

export async function reiniciarConActualizacion(): Promise<void> {
  if (!Updates.isEnabled) return;
  await Updates.reloadAsync();
}

export function useHayActualizacionLista(): boolean {
  return Updates.useUpdates().isUpdatePending;
}
