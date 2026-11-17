import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  guardarChatEntreVecinos,
  obtenerChatEntreVecinos,
  puedeEscribirEnConversacion,
} from "../services/chatEntreVecinos.repo";

const chatEntreVecinosQueryKey = ["condominio", "chat-entre-vecinos"];

/**
 * El ajuste del edificio, para la administración (Canales del chat).
 * Al guardarlo, las conversaciones abiertas vuelven a preguntar si se puede
 * escribir.
 */
export function useChatEntreVecinos() {
  const client = useQueryClient();
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...chatEntreVecinosQueryKey, condominioId],
    queryFn: () => obtenerChatEntreVecinos(condominioId),
    enabled: Boolean(condominioId),
  });

  const guardar = useMutation({
    mutationFn: (activo: boolean) => guardarChatEntreVecinos(condominioId, activo),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: chatEntreVecinosQueryKey });
      void client.invalidateQueries({ queryKey: ["chat", "puede-escribir"] });
      addToast("Ajuste del chat actualizado", "success");
    },
    onError: (error) => addToast(mensajeDeError(error, "No se pudo guardar"), "error"),
  });

  return {
    activo: query.data ?? false,
    cargando: query.isLoading,
    fallo: query.isError && query.data === undefined,
    reintentar: () => void query.refetch(),
    guardando: guardar.isPending,
    setActivo: guardar.mutate,
  };
}

/**
 * Si se ofrece la caja de escribir en esta conversación. Mientras la base no
 * contesta, o si falla la pregunta, se ofrece: la base es quien decide, y
 * esconderla por un fallo de red dejaría sin chat a quien sí puede.
 */
export function usePuedeEscribir(conversacionId: string, esGrupo: boolean) {
  const query = useQuery({
    queryKey: ["chat", "puede-escribir", conversacionId],
    queryFn: () => puedeEscribirEnConversacion(conversacionId),
    // Solo los canales dependen del ajuste.
    enabled: Boolean(conversacionId) && esGrupo,
  });
  return !esGrupo || query.data !== false;
}
