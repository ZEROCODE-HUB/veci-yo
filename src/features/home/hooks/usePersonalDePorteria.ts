import { useQuery } from "@tanstack/react-query";
import { obtenerPersonalDePorteria } from "../services/personalDePorteria.repo";

/**
 * Quién de la portería recibe mensajes y quién está de turno ahora
 * (17/11/2026). Se vuelve a pedir cada minuto mientras la pantalla está
 * abierta: un turno empieza o termina sin que nadie toque nada.
 */
export function usePersonalDePorteria(condominioId: string, activo = true) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["chat", "personal-de-porteria", condominioId],
    queryFn: () => obtenerPersonalDePorteria(condominioId),
    enabled: activo && Boolean(condominioId),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  return { personal: data ?? [], cargando: isLoading, fallo: isError };
}
