import { usePerfilStore } from "@/stores/perfil-store";
import type { Reclamo } from "@/stores/perfil-store";

const simularRespuesta = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const obtenerReclamos = () =>
  simularRespuesta(usePerfilStore.getState().reclamos);

export const crearReclamo = (
  datos: Omit<
    Reclamo,
    | "id"
    | "numero"
    | "nombre"
    | "ci"
    | "estado"
    | "fechaCreacion"
    | "fechaRevision"
  >,
) => simularRespuesta(usePerfilStore.getState().agregarReclamo(datos));

export const actualizarEstadoReclamo = (id: number, estado: string) => {
  usePerfilStore.getState().actualizarEstadoReclamo(id, estado);
  return simularRespuesta(true);
};

export const actualizarEstadoReclamoConMensaje = (
  id: number,
  estado: string,
  mensaje: string,
) => {
  usePerfilStore
    .getState()
    .actualizarEstadoReclamoConMensaje(id, estado, mensaje);
  return simularRespuesta(true);
};
