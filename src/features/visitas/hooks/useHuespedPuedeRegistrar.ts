import { useQuery } from "@tanstack/react-query";
import { huespedPuedeRegistrarVisitas } from "../services/visitasDelHuesped.repo";

/**
 * Si el huésped temporal puede registrar visitas: lo decide su anfitrión
 * (15/10/2026). Mientras no se sabe, no se quita nada: solo un «no» de la base
 * lo impide. Salió de `VisitasHistorialScreen` el 26/10/2026.
 */
export function useHuespedPuedeRegistrar(esHuesped: boolean, unidadId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["visitas", "huesped-puede-registrar", unidadId],
    queryFn: () => huespedPuedeRegistrarVisitas(unidadId ?? ""),
    enabled: esHuesped && Boolean(unidadId),
  });
  return data !== false;
}
