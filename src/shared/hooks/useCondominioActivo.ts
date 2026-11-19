import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { useUnidadesDisponibles } from "./useUnidadesDisponibles";

/**
 * El condominio en el que opera el usuario actual.
 *
 * Un administrador o un guardia lo tienen por su membresia de condominio; un
 * residente, a traves de la unidad donde vive. Hoy una persona pertenece a un
 * solo condominio; el dia que pertenezca a varios, este hook es el unico lugar
 * que hay que cambiar para que la app pregunte cual.
 */
export function useCondominioActivo(): string | null {
  const condominios = useAuthStore((s) => s.condominios);
  const unidades = useAuthStore((s) => s.unidades);
  const { unidades: unidadesDelEdificio } = useUnidadesDisponibles();
  // El profesional permanente no tiene membresías: su edificio viene en la
  // ubicación (18/11/2026).
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);

  return (
    condominios[0]?.condominioId ??
    unidades[0]?.condominioId ??
    unidadesDelEdificio[0]?.condominioId ??
    ubicaciones.find((u) => u.condominioId)?.condominioId ??
    null
  );
}
