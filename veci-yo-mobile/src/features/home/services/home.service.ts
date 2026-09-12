import { useNotificacionesStore } from "../stores";
import type { Notificacion, RolNotificaciones } from "../types";

const SIMULATED_REQUEST_DELAY = 150;

const esperar = () =>
  new Promise<void>((resolve) => setTimeout(resolve, SIMULATED_REQUEST_DELAY));

export async function obtenerNotificacionesRequest(
  rol: RolNotificaciones,
): Promise<Notificacion[]> {
  await esperar();
  return useNotificacionesStore.getState().notificaciones[rol] || [];
}

export async function marcarNotificacionLeidaRequest(data: {
  rol: RolNotificaciones;
  id: number;
}) {
  await esperar();
  useNotificacionesStore.getState().marcarLeida(data.rol, data.id);
  return data;
}

