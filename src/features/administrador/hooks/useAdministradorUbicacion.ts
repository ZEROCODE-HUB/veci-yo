import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import type { UbicacionFormValues } from "../types/ubicacion";
import {
  actualizarCondominio,
  etiquetaIdentificacionFiscal,
  obtenerCondominio,
} from "../services/condominio.repo";
import { mensajeDeError } from "@/shared/utils/error.util";

export const condominioQueryKey = ["administrador", "condominio"] as const;

export function useAdministradorUbicacion() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...condominioQueryKey, condominioId],
    queryFn: () => obtenerCondominio(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (valores: UbicacionFormValues) =>
      actualizarCondominio(condominioId, valores),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: condominioQueryKey });
      addToast("Datos del condominio actualizados", "success");
    },
    onError: (error) =>
      addToast(
        mensajeDeError(error, "No se pudo guardar"),
        "error",
      ),
  });

  return {
    valores: query.data?.valores,
    cargando: query.isLoading,
    // La etiqueta del identificador fiscal depende del pais: RUC o NIT.
    etiquetaFiscal: etiquetaIdentificacionFiscal(query.data?.paisIso ?? "CO"),
    guardar: guardar.mutate,
    guardando: guardar.isPending,
  };
}
