import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aprobarDocumentoAMano } from "../services/porteria.repo";
import { VISITAS_QUERY_KEY } from "./useVisitas";

/**
 * Aprobar a mano el documento de un huésped en portería (26/10/2026). Refresca
 * lo mismo que verificar por número: la lista y la portada.
 */
export function useAprobarAMano() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ invitadoUuid }: { invitadoUuid: string }) =>
      aprobarDocumentoAMano(invitadoUuid),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
      void client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}
