import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  guardarDocumentoAmigosObligatorio,
  obtenerDocumentoAmigosObligatorio,
} from "@/features/administrador/services/condominio.repo";

export const documentoDeAmigosQueryKey = ["condominio", "documento-amigos"];

/**
 * Si la portería pide documento a amigos y familiares (16/11/2026).
 *
 * Una sola clave para la administración, que lo cambia en Permisos, y para el
 * formulario del guardia, que lo lee: al guardarlo, el formulario queda al día
 * sin recargar.
 */
export function useDocumentoDeAmigos() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...documentoDeAmigosQueryKey, condominioId],
    queryFn: () => obtenerDocumentoAmigosObligatorio(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (obligatorio: boolean) =>
      guardarDocumentoAmigosObligatorio(condominioId, obligatorio),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: documentoDeAmigosQueryKey });
      addToast("Regla de documento actualizada", "success");
    },
    onError: (error) => addToast(mensajeDeError(error, "No se pudo guardar"), "error"),
  });

  return {
    obligatorio: query.data ?? false,
    cargando: query.isLoading,
    fallo: query.isError && query.data === undefined,
    reintentar: () => void query.refetch(),
    guardando: guardar.isPending,
    setObligatorio: guardar.mutate,
  };
}
