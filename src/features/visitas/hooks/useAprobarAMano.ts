import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aprobarDocumentoAMano, verificarDocumentoEscaneado } from "../services/porteria.repo";
import { VISITAS_QUERY_KEY } from "./useVisitas";
import type { FormaDeEscaneo } from "../components/ConfirmarIdentidad";

/**
 * Aprobar a mano el documento de un huésped en portería (26/10/2026), con su
 * motivo (05/11/2026). Refresca lo mismo que verificar: la lista y la portada.
 */
export function useAprobarAMano() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ invitadoUuid, motivo }: { invitadoUuid: string; motivo: string }) =>
      aprobarDocumentoAMano(invitadoUuid, motivo),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
      void client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

/** El escaneo coincidió: la base lo anota con el camino por el que coincidió (05/11/2026). */
export function useVerificarPorEscaneo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ invitadoUuid, forma }: { invitadoUuid: string; forma: FormaDeEscaneo }) =>
      verificarDocumentoEscaneado(invitadoUuid, forma),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
      void client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}
