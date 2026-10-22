/**
 * avisosPush · el único sitio que habla con OneSignal (versión del celular)
 *
 * Misma forma que `avisosPush.ts`, que es la de la web y las pruebas. Nada
 * fuera de estos dos archivos importa `react-native-onesignal`.
 *
 * A quién le llega: `OneSignal.login(usuarioId)` ata el celular a la cuenta
 * (en OneSignal es su `external_id`, y la función `enviar-push` manda a ese
 * id). Al salir, `logout` lo suelta: si no, el siguiente que entre en ese
 * celular seguiría recibiendo los avisos del anterior.
 *
 * El permiso **no se pide al abrir la app**: se pide desde Perfil › Avisos,
 * con el botón «Activar avisos en este celular», cuando la persona entiende
 * para qué es.
 */
import {
  LogLevel,
  OneSignal,
  type NotificationClickEvent,
  type NotificationWillDisplayEvent,
} from "react-native-onesignal";
import { estaRegistrado, notificacionIdDe, type EstadoDelCelular } from "./avisosPush.logica";

export type AlRecibirAviso = (notificacionId: string, tocado: boolean) => void;

let iniciado = false;

export function iniciarAvisosPush(appId: string): void {
  if (iniciado || !appId) return;
  iniciado = true;
  // En las versiones de prueba se ve en la consola de Android qué hace el SDK.
  OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn);
  OneSignal.initialize(appId);
}

export function entrarEnAvisosPush(usuarioId: string): void {
  if (!iniciado) return;
  OneSignal.login(usuarioId);
}

export function salirDeAvisosPush(): void {
  if (!iniciado) return;
  OneSignal.logout();
}

export async function pedirPermisoDeAvisos(): Promise<boolean> {
  if (!iniciado) return false;
  // `true`: si ya lo negó antes, el sistema no vuelve a preguntar y OneSignal
  // lleva a los ajustes del celular, que es lo único que sirve entonces.
  const concedido = await OneSignal.Notifications.requestPermission(true);
  if (concedido) OneSignal.User.pushSubscription.optIn();
  return concedido;
}

export async function estadoDelCelular(): Promise<EstadoDelCelular> {
  if (!iniciado) return { disponible: true, permiso: false, registrado: false };
  const [permiso, id] = await Promise.all([
    OneSignal.Notifications.getPermissionAsync(),
    OneSignal.User.pushSubscription.getIdAsync(),
  ]);
  return { disponible: true, permiso, registrado: estaRegistrado(id) };
}

export function escucharAvisos(alRecibir: AlRecibirAviso): () => void {
  const alMostrar = (evento: NotificationWillDisplayEvent) => {
    const notificacion = evento.getNotification();
    const id = notificacionIdDe(notificacion.additionalData);
    if (id) alRecibir(id, false);
    // Sin `preventDefault` OneSignal lo enseña igual con la app abierta: si no
    // se viera, parecería que no llegó.
  };
  const alTocar = (evento: NotificationClickEvent) => {
    const id = notificacionIdDe(evento.notification.additionalData);
    if (id) alRecibir(id, true);
  };
  OneSignal.Notifications.addEventListener("foregroundWillDisplay", alMostrar);
  OneSignal.Notifications.addEventListener("click", alTocar);
  return () => {
    OneSignal.Notifications.removeEventListener("foregroundWillDisplay", alMostrar);
    OneSignal.Notifications.removeEventListener("click", alTocar);
  };
}

export function escucharEstadoDelCelular(alCambiar: () => void): () => void {
  const alCambiarPermiso = () => alCambiar();
  const alCambiarSuscripcion = () => alCambiar();
  OneSignal.Notifications.addEventListener("permissionChange", alCambiarPermiso);
  OneSignal.User.pushSubscription.addEventListener("change", alCambiarSuscripcion);
  return () => {
    OneSignal.Notifications.removeEventListener("permissionChange", alCambiarPermiso);
    OneSignal.User.pushSubscription.removeEventListener("change", alCambiarSuscripcion);
  };
}
