import { useZonasStore } from "@/stores/zonas-store";

const simularRespuesta = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const obtenerDatosZonas = () =>
  simularRespuesta({
    zonasComunesConfig: useZonasStore.getState().zonasComunesConfig,
    gestionZonas: useZonasStore.getState().gestionZonas,
    reservas: useZonasStore.getState().reservas,
  });
