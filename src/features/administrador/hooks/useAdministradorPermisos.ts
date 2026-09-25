import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import type { PermisoVivienda } from "@/shared/types";
import { guardarPermisos, obtenerPermisos } from "../services/permisos.repo";
import { PERMISOS_INICIALES } from "../services/permisosSinDecidir";

export const permisosQueryKey = ["administrador", "permisos"] as const;

export function useAdministradorPermisos() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...permisosQueryKey, condominioId],
    queryFn: () => obtenerPermisos(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (datos: PermisoVivienda) => guardarPermisos(condominioId, datos),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: permisosQueryKey });
      addToast("Permisos actualizados", "success");
    },
    onError: (error) =>
      addToast(
        error instanceof Error ? error.message : "No se pudieron guardar",
        "error",
      ),
  });

  return {
    data: query.data ?? PERMISOS_INICIALES,
    cargando: query.isLoading,
    savePermisos: guardar.mutate,
    guardando: guardar.isPending,
  };
}
