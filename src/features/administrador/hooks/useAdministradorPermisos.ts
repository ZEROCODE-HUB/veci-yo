import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo, useParametrosDeLaBase } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import type { PermisoVivienda } from "@/shared/types";
import {
  guardarPermisos,
  guardarPermisosDeUnidad,
  obtenerPermisos,
  permisosDeUnidad,
  volverALaReglaDelEdificio,
} from "../services/permisos.repo";
import { crearPermisosIniciales } from "../services/permisosSinDecidir";
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
  /*
    Lo que vale un permiso que nadie ha decidido es el parámetro
    `permitir_si_no_configurado`. Sin él no se lee ni se rellena nada.
  */
  const parametros = useParametrosDeLaBase();
  const siNoConfigurado = parametros.listo
    ? parametros.booleano("permitir_si_no_configurado")
    : null;

  const query = useQuery({
    queryKey: [...permisosQueryKey, condominioId, unidadId ?? "condominio"],
    queryFn: () =>
      unidadId
        ? permisosDeUnidad(unidadId, siNoConfigurado as boolean)
        : obtenerPermisos(condominioId, siNoConfigurado as boolean),
    enabled: Boolean(condominioId) && siNoConfigurado !== null,
  });

  const guardar = useMutation({
    mutationFn: (datos: PermisoVivienda) =>
      unidadId
        ? guardarPermisosDeUnidad(
            condominioId,
            unidadId,
            datos,
            siNoConfigurado as boolean,
          )
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

  const volverAlEdificio = useMutation({
    mutationFn: () =>
      unidadId
        ? volverALaReglaDelEdificio(condominioId, unidadId)
        : Promise.resolve(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: permisosQueryKey });
      addToast("La vivienda sigue ahora la regla del edificio", "success");
    },
    onError: (error) =>
      addToast(mensajeDeError(error, "No se pudo quitar la excepción"), "error"),
  });

  return {
    /** `null` solo mientras no han llegado los parámetros. */
    data:
      query.data ??
      (siNoConfigurado === null ? null : crearPermisosIniciales(siNoConfigurado)),
    /** Solo con vivienda: borra su excepción entera. */
    volverAlEdificio: volverAlEdificio.mutate,
    volviendo: volverAlEdificio.isPending,
    cargando: query.isLoading,
    /** Lo guardado ya llegó. Hasta entonces `data` son los valores de fábrica. */
    cargado: query.isSuccess,
    savePermisos: guardar.mutate,
    guardando: guardar.isPending,
  };
}
