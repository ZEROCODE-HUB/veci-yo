import { useZonasStore } from "@/stores";
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
export async function updateReservaZonaRequest({
  id,
  datos,
}: {
  id: number;
  datos: Record<string, unknown>;
}) {
  await pause();
  useZonasStore.getState().actualizarReserva(id, datos);
  return id;
}
export async function updateEstadoReservaZonaRequest({
  id,
  estado,
}: {
  id: number;
  estado: string;
}) {
  await pause();
  useZonasStore.getState().actualizarEstadoReserva(id, estado);
  return id;
}
export async function deleteReservaZonaRequest(id: number) {
  await pause();
  useZonasStore.getState().eliminarReserva(id);
  return id;
}
