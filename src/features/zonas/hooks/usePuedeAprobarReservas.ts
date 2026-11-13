import { useCondominioActivo } from "@/shared/hooks";
import { useAuthStore } from "@/stores";

/**
 * Si el guardia tiene el permiso de aprobar reservas de zonas comunes
 * (`membresia_condominio.permisos.reservas`, que da la administración en
 * Seguridad). Sin él no se le ofrece «Aprobaciones» (13/11/2026, cliente).
 */
export function usePuedeAprobarReservas(): boolean {
  const condominioActivo = useCondominioActivo();
  const condominios = useAuthStore((s) => s.condominios);
  const membresia =
    condominios.find((c) => c.rol === "guardia" && c.condominioId === condominioActivo) ??
    condominios.find((c) => c.rol === "guardia");
  return Boolean((membresia?.permisos as Record<string, unknown> | undefined)?.reservas);
}
