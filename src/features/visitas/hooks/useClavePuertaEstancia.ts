import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guardarClavePuertaEstancia, obtenerClavePuertaEstancia } from "../services/visitas.repo";

/** La clave de la puerta de una reserva, para el anfitrión (16/10/2026). */
export function useClavePuertaEstancia(visitaId: string | undefined) {
  const queryClient = useQueryClient();
  const clave = useQuery({
    queryKey: ["visitas", "clave-puerta", visitaId],
    queryFn: () => obtenerClavePuertaEstancia(visitaId!),
    enabled: Boolean(visitaId),
  });
  const guardar = useMutation({
    mutationFn: (nueva: string) => guardarClavePuertaEstancia(visitaId!, nueva),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["visitas", "clave-puerta", visitaId] }),
  });
  return { clave: clave.data ?? null, cargando: clave.isLoading, guardar };
}
