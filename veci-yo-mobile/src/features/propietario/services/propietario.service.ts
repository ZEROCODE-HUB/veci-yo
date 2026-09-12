import { usePropietarioStore } from "@/stores/propietario-store";
import type { Residente } from "@/shared/types";

const simularRespuesta = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const obtenerResidentes = () =>
  simularRespuesta(usePropietarioStore.getState().residentes);

export const crearResidente = (
  datos: Omit<Residente, "id"> & Record<string, unknown>,
) => {
  usePropietarioStore
    .getState()
    .agregarResidente(
      datos as Parameters<
        ReturnType<typeof usePropietarioStore.getState>["agregarResidente"]
      >[0],
    );
  return simularRespuesta(true);
};

export const actualizarResidente = (
  datos: Partial<Residente> & { id: number; [key: string]: unknown },
) => {
  usePropietarioStore.getState().actualizarResidente(datos);
  return simularRespuesta(true);
};

export const eliminarResidente = (id: number) => {
  usePropietarioStore.getState().eliminarResidente(id);
  return simularRespuesta(true);
};

export const simularAgregarServicio = <T>(datos: T) => simularRespuesta(datos);
