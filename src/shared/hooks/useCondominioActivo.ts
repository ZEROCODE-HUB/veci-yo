import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { useUnidadesDisponibles } from "./useUnidadesDisponibles";
import { condominioDelRol } from "./condominioDelRol";

/**
 * El condominio en el que opera el usuario actual, según el rol con el que
 * entró (`condominioDelRol`): quien administra un edificio y es guardia o
 * vecino en otro trabaja en el de su rol activo, no en el primero de la lista
 * (20/11/2026).
 */
export function useCondominioActivo(): string | null {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominios = useAuthStore((s) => s.condominios);
  const unidades = useAuthStore((s) => s.unidades);
  const { unidades: unidadesDelEdificio } = useUnidadesDisponibles();
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const elegida = ubicaciones.find((u) => u.favorito) ?? ubicaciones[0];

  return (
    condominioDelRol(rolActivo, condominios, unidades, elegida) ??
    unidadesDelEdificio[0]?.condominioId ??
    ubicaciones.find((u) => u.condominioId)?.condominioId ??
    null
  );
}
