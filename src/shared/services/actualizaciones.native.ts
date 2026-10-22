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

export async function aplicarActualizacionSiHay(): Promise<void> {
  if (!Updates.isEnabled) return;
  // Se compara con la que está corriendo: si ya se había descargado sola en
  // segundo plano, `fetch` dice que no es nueva, pero igual hay que reiniciar.
  const { isAvailable } = await Updates.checkForUpdateAsync();
  if (!isAvailable) return;
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}

export async function reiniciarConActualizacion(): Promise<void> {
  if (!Updates.isEnabled) return;
  await Updates.reloadAsync();
}

export function useHayActualizacionLista(): boolean {
  return Updates.useUpdates().isUpdatePending;
}
