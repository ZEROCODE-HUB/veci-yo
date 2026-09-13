import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useZonasStore } from "@/stores";
import {
  deleteGestionZonaRequest,
  saveGestionZonaRequest,
} from "../services/administradorGestionZonas.service";

export const gestionZonasQueryKey = ["administrador", "gestion-zonas"] as const;

export function useAdministradorGestionZonas() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: gestionZonasQueryKey,
    queryFn: async () => useZonasStore.getState().gestionZonas,
    initialData: useZonasStore.getState().gestionZonas,
  });
  
  const saveMutation = useMutation({
    mutationFn: saveGestionZonaRequest,
    onSuccess: ({ zona, zonaConfig }) => {
      const state = useZonasStore.getState();
      if (state.gestionZonas[zona.id])
        state.actualizarGestionZona(zona.id, zona, zonaConfig);
      else state.agregarGestionZona(zona, zonaConfig);
      void queryClient.invalidateQueries({ queryKey: gestionZonasQueryKey });
    },
  });
  
  
  const deleteMutation = useMutation({
    mutationFn: deleteGestionZonaRequest,
    onSuccess: (id) => {
      useZonasStore.getState().eliminarGestionZona(id);
      void queryClient.invalidateQueries({ queryKey: gestionZonasQueryKey });
    },
  });
  
  return {
    ...query,
    saveZona: saveMutation.mutate,
    deleteZona: deleteMutation.mutate,
  };
}
