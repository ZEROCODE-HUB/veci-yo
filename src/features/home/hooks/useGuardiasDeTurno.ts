import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { obtenerGuardiasDeTurno } from "../services/chat.repo";

/**
 * Quién atiende la portería ahora mismo.
 *
 * La cabecera del chat con Seguridad nombraba a "Roberto Hornado" y "Juan
 * Franco", que eran dos guardias inventados: salían de una lista fija sin
 * relación con los turnos.
 */
export function useGuardiasDeTurno() {
  const condominioId = useCondominioActivo() ?? "";

  const { data } = useQuery({
    queryKey: ["chat", "guardias-turno", condominioId],
    queryFn: () => obtenerGuardiasDeTurno(condominioId),
    enabled: Boolean(condominioId),
    // Cambia con el turno, no con cada render.
    staleTime: 5 * 60 * 1000,
  });

  return data ?? [];
}
