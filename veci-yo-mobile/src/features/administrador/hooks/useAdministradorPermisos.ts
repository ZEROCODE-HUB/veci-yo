import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores";
import type { PermisoVivienda } from "@/shared/types";
import { savePermisosRequest } from "../services/administradorPermisos.service";
export function useAdministradorPermisos() {
  const client = useQueryClient(); const query = useQuery({ queryKey: ["administrador", "permisos"], queryFn: async () => useAdminStore.getState().permisos, initialData: useAdminStore.getState().permisos });
  const mutation = useMutation({ mutationFn: savePermisosRequest, onSuccess: (data: PermisoVivienda) => { useAdminStore.getState().actualizarPermisos(data); void client.invalidateQueries({ queryKey: ["administrador", "permisos"] }); } });
  return { ...query, savePermisos: mutation.mutate };
}
