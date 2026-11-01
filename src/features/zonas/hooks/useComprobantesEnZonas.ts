import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { sePidenComprobantes } from "../services/zonas.repo";

/**
 * Si en el edificio activo las reservas de zonas de pago piden el comprobante
 * de pago (Para Claude 202, 01/11/2026). Lo elige la administración en
 * Permisos. Mientras no llega la respuesta se da por encendido, que es lo de
 * siempre.
 */
export function useComprobantesEnZonas(): boolean {
  const condominioId = useCondominioActivo() ?? "";
  const { data } = useQuery({
    queryKey: ["comprobantes-en-zonas", condominioId],
    queryFn: () => sePidenComprobantes(condominioId),
    enabled: Boolean(condominioId),
  });
  return data ?? true;
}
