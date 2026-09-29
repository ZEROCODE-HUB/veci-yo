import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  guardarVerificacionDeDocumento,
  obtenerVerificacionDeDocumento,
} from "../services/condominio.repo";

export const verificacionDocumentoQueryKey = [
  "condominio",
  "verificar-documento",
];

/**
 * Si la portería tiene que comparar el documento del invitado al entrar.
 *
 * Vive en `condominio` y no en `permiso_vivienda` porque el cliente decidió
 * (29/09/2026) que **lo decide el edificio para todas sus visitas**, no vivienda
 * por vivienda. Antes no lo decidía nadie: el formulario lo cableaba por el tipo
 * de visita --amigos nunca-- mientras a quien invitaba se le pedía el documento
 * y se le decía que su invitado lo presentara en portería. Punto 66 de
 * `REVISAR-A-OJO.md`.
 *
 * La misma clave que usa `useVisitasNuevo` para leerlo, así que al guardarlo
 * aquí el formulario de la visita queda al día sin recargar.
 */
export function useVerificacionDeDocumento() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...verificacionDocumentoQueryKey, condominioId],
    queryFn: () => obtenerVerificacionDeDocumento(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (verificar: boolean) =>
      guardarVerificacionDeDocumento(condominioId, verificar),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: verificacionDocumentoQueryKey,
      });
      addToast("Regla de documento actualizada", "success");
    },
    onError: (error) =>
      addToast(mensajeDeError(error, "No se pudo guardar"), "error"),
  });

  return {
    verificar: query.data ?? true,
    guardando: guardar.isPending,
    setVerificar: guardar.mutate,
  };
}
