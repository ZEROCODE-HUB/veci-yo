import { useVisitasStore } from "@/stores/visitas-store";

const simularRespuesta = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const obtenerVisitas = () =>
  simularRespuesta(useVisitasStore.getState().items);
