/**
 * La puerta común de los módulos nativos de Expo, apartada.
 *
 * Por `expo-modules-core` pasan el portapapeles, el selector de imágenes, el
 * de documentos y el almacén seguro. Cada uno pide su módulo nativo **al
 * importarse**, así que sin esto se cae cualquier pantalla que arrastre uno
 * por un barril --y `@/shared/components` los arrastra casi todos--.
 *
 * Va por alias y no por `vi.mock`: el doble tiene que valer también para los
 * imports que ocurren dentro de `node_modules`, donde el especificador no
 * siempre es el mismo que se escribe aquí.
 *
 * Nada de esto hace nada. Una prueba que necesite de verdad el portapapeles
 * tendrá que doblarlo ella y decir qué espera de él, que es justo lo que debe
 * hacer.
 */
class ModuloNativo {
  addListener() {
    return { remove() {} };
  }
  removeAllListeners() {}
  emit() {}
}

const nada = () => ({}) as never;

export const requireNativeModule = nada;
export const requireOptionalNativeModule = () => null;
export const requireNativeView = nada;
export const NativeModule = ModuloNativo;
export const EventEmitter = ModuloNativo;
export class SharedObject {}
export class SharedRef {}
export const NativeModulesProxy = new Proxy({}, { get: nada });
export const createPermissionHook = () => () => [null, nada, nada];
export const createWebModule = nada;
export const registerWebModule = nada;
export const Platform = { OS: "web" };
export class UnavailabilityError extends Error {}
export class CodedError extends Error {}
export const uuid = { v4: () => "uuid-de-prueba" };
export default {};
