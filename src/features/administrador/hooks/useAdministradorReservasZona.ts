import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useZonasStore } from "@/stores";
import { deleteReservaZonaRequest, updateEstadoReservaZonaRequest, updateReservaZonaRequest } from "../services/administradorReservasZona.service";
export function useAdministradorReservasZona(zonaId: string) {
  const queryClient = useQueryClient(); const key = ["administrador", "reservas-zona", zonaId];
  const query = useQuery({ queryKey: key, queryFn: async () => useZonasStore.getState().reservas.filter((item) => item.zonaId === zonaId), initialData: useZonasStore.getState().reservas.filter((item) => item.zonaId === zonaId) });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: key });
  const updateEstado = useMutation({ mutationFn: updateEstadoReservaZonaRequest, onSuccess: invalidate });
  const updateReserva = useMutation({ mutationFn: updateReservaZonaRequest, onSuccess: invalidate });
  const deleteReserva = useMutation({ mutationFn: deleteReservaZonaRequest, onSuccess: invalidate });
  return { ...query, updateEstado: updateEstado.mutate, updateReserva: updateReserva.mutate, deleteReserva: deleteReserva.mutate };
}
