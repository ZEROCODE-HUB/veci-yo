/**
 * avisosPush · el único sitio que habla con OneSignal
 *
 * Esta es la versión **sin push**: la que usan la web y las pruebas. En el
 * celular Metro toma `avisosPush.native.ts`, que tiene la misma forma y llama
 * al SDK de verdad. Las dos exportan lo mismo; si se añade algo, va en las dos.
 *
 * La app será solo móvil (22/10/2026); la web queda para pruebas hasta que el
 * tester tenga la app instalada, y ahí el push no existe.
 */
import { SIN_PUSH, type EstadoDelCelular } from "./avisosPush.logica";

export type AlRecibirAviso = (notificacionId: string, tocado: boolean, tipo: string | null) => void;

/** Arranca OneSignal con el id de la app. Una sola vez. */
export function iniciarAvisosPush(_appId: string): void {}

/** Desde ahora este celular recibe los avisos de esta cuenta. */
export function entrarEnAvisosPush(_usuarioId: string): void {}

/** Este celular deja de recibir los avisos de la cuenta que salió. */
export function salirDeAvisosPush(): void {}

/** Pide el permiso de notificaciones. Devuelve si quedó concedido. */
export async function pedirPermisoDeAvisos(): Promise<boolean> {
  return false;
}

/** Cómo está este celular para recibir avisos. */
export async function estadoDelCelular(): Promise<EstadoDelCelular> {
  return SIN_PUSH;
}

/**
 * Avisa cuando llega un push con la app abierta (`tocado` falso) o cuando la
 * persona lo toca (`tocado` verdadero). Devuelve cómo dejar de escuchar.
 */
export function escucharAvisos(_alRecibir: AlRecibirAviso): () => void {
  return () => {};
}

/** Avisa cuando cambia el permiso o el registro del celular. */
export function escucharEstadoDelCelular(_alCambiar: () => void): () => void {
  return () => {};
}
