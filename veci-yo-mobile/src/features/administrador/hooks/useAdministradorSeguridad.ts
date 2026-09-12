import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/admin-store";
import {
  administradorSeguridadQueryKey,
  createGuardiaRequest,
  deleteGuardiaRequest,
  fetchSecuritySnapshot,
  getCurrentSecuritySnapshot,
  updateGuardiaRequest,
} from "../services/administradorSeguridad.service";

export function useAdministradorSeguridad() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: administradorSeguridadQueryKey });
  const query = useQuery({
    queryKey: administradorSeguridadQueryKey,
    queryFn: fetchSecuritySnapshot,
    initialData: getCurrentSecuritySnapshot,
  });

  const createGuardia = useMutation({
    mutationFn: createGuardiaRequest,
    onSuccess: (data) => {
      useAdminStore.getState().agregarGuardia(data);
      invalidate();
    },
  });
  const updateGuardia = useMutation({
    mutationFn: updateGuardiaRequest,
    onSuccess: (data) => {
      useAdminStore.getState().actualizarGuardia(data);
      invalidate();
    },
  });
  const deleteGuardia = useMutation({
    mutationFn: deleteGuardiaRequest,
    onSuccess: (data) => {
      useAdminStore.getState().eliminarGuardia(data);
      invalidate();
    },
  });

  return {
    ...query,
    data: query.data ?? getCurrentSecuritySnapshot(),
    createGuardia,
    updateGuardia,
    deleteGuardia,
  };
}
