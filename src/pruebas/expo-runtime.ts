/**
 * El paquete `expo` apartado.
 *
 * Es un paquete pensado para Metro: su código hace imports de directorio
 * --`./ImportMetaRegistry`, `./setupFastRefresh`-- que Node en ESM no
 * resuelve. Nada de `src/` lo importa; entra de rebote cuando un barril
 * arrastra `expo-image-picker`, `expo-splash-screen` o similar.
 *
 * Lo que aporta en la app --registro de módulos, recarga en caliente,
 * polyfills del runtime-- no es lo que comprueban estas pruebas. Lo que sí
 * hace falta es lo que **otros paquetes de Expo le importan**, que resulta
 * ser sobre todo el andamiaje de permisos: `expo-image-picker` saca de aquí
 * `createPermissionHook` y `PermissionStatus`.
 */
export const PermissionStatus = {
  GRANTED: "granted",
  UNDETERMINED: "undetermined",
  DENIED: "denied",
} as const;

/** Devuelve el hook con la forma que espera quien lo llama: `[estado, pedir, consultar]`. */
export const createPermissionHook = () => () =>
  [null, async () => ({ status: PermissionStatus.GRANTED }), async () => ({
    status: PermissionStatus.GRANTED,
  })];

export const isRunningInExpoGo = () => false;
export const registerRootComponent = () => {};
export default {};
