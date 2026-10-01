import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import type { PermisoVivienda } from "@/shared/types";
import {
  guardarPermisos,
  guardarPermisosDeUnidad,
  obtenerPermisos,
  permisosDeUnidad,
} from "../services/permisos.repo";
import { PERMISOS_INICIALES } from "../services/permisosSinDecidir";
import { mensajeDeError } from "@/shared/utils/error.util";

export const permisosQueryKey = ["administrador", "permisos"] as const;

/**
 * Los permisos de todo el edificio, o los de una vivienda concreta.
 *
 * Con `unidadId` se leen y se guardan los de **esa** vivienda, que es la
 * excepción que la administración puede conceder. Las dos funciones que hacen
 * falta estaban escritas desde hacía días y no las llamaba nadie (R-34): la
 * pantalla solo sabía configurar el ajuste general, aunque la tabla tenga
 * `unidad_id`, `permisos_de_unidad` combine campo a campo, y el KT diga que el
 * permiso de entrega directa «vive a nivel unidad, configurado por el
 * Administrador».
 */
export function useAdministradorPermisos(unidadId?: string) {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...permisosQueryKey, condominioId, unidadId ?? "condominio"],
    queryFn: () =>
      unidadId ? permisosDeUnidad(unidadId) : obtenerPermisos(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (datos: PermisoVivienda) =>
      unidadId
        ? guardarPermisosDeUnidad(condominioId, unidadId, datos)
        : guardarPermisos(condominioId, datos),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: permisosQueryKey });
      addToast("Permisos actualizados", "success");
    },
    onError: (error) =>
      addToast(
        mensajeDeError(error, "No se pudieron guardar"),
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
