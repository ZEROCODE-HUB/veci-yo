import { useQuery } from "@tanstack/react-query";
import { obtenerLimites } from "../services/suscripcion.repo";

/**
 * Si el edificio deja alquilar por noches esta vivienda (13/11/2026, cliente:
 * «si el edificio no lo tiene activado, que no aparezca esa opción de renta
 * corta»). Mientras no se sabe, se da por permitida: así no desaparece y
 * reaparece al cargar en los edificios que sí la tienen.
 *
 * Misma consulta que `useHuespedesTemporales`, así que se comparte.
 */
export function useRentaCortaPermitida(unidadId: string | null | undefined): boolean {
  const { data } = useQuery({
    queryKey: ["limites-condominio", unidadId ?? ""],
    queryFn: () => obtenerLimites(unidadId ?? ""),
    enabled: Boolean(unidadId),
  });
  return data?.permiteRentaCorta ?? true;
}
