import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guardarClavePuertaEstancia, obtenerClavePuertaEstancia } from "../services/visitas.repo";
import { estadoDe } from "@/shared/components";

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
  return {
    clave: clave.data ?? null,
    cargando: clave.isLoading,
    // Un fallo dejaba el campo vacío, como si no hubiera clave (13/11/2026).
    estado: estadoDe(clave),
    guardar,
  };
}
