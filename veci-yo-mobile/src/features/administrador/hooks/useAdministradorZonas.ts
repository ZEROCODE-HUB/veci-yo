import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useZonasStore } from "@/stores/zonas-store";
import {
  administradorZonasQueryKey,
  deleteZonaRequest,
  fetchZonasConfig,
  getCurrentZonasConfig,
  saveZonaRequest,
} from "../services/administradorZonas.service";

export function useAdministradorZonas() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: administradorZonasQueryKey });
  const query = useQuery({
    queryKey: administradorZonasQueryKey,
    queryFn: fetchZonasConfig,
    initialData: getCurrentZonasConfig,
  });
  const saveZona = useMutation({
    mutationFn: saveZonaRequest,
    onSuccess: (data) => {
      const current = useZonasStore.getState().zonasComunesConfig[data.id];
      if (current) useZonasStore.getState().actualizarZonaComun(data.id, data);
      else useZonasStore.getState().agregarZonaComun(data);
      invalidate();
    },
  });
  const deleteZona = useMutation({
    mutationFn: deleteZonaRequest,
    onSuccess: (id) => {
      useZonasStore.getState().eliminarZonaComun(id);
      invalidate();
    },
  });
  return {
    ...query,
    data: query.data ?? getCurrentZonasConfig(),
    saveZona,
    deleteZona,
  };
}
