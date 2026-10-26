import { useQuery } from "@tanstack/react-query";
import { useUnidadActiva } from "./useUnidadActiva";
import { misPermisosEnLaVivienda, type AccionEnLaVivienda } from "@/shared/services/permisosDeRol";

/**
 * Lo que el rol de quien está en sesión puede hacer en su vivienda activa
 * (huecos 9 y 14). Mientras no se sabe, se ofrece lo de siempre --registrar y
 * reservar sí, invitar no--: la base es la que decide al guardar.
 */
export function usePermisosEnLaVivienda() {
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";
  const query = useQuery({
    queryKey: ["permisos-de-rol", "vivienda", unidadId],
    queryFn: () => misPermisosEnLaVivienda(unidadId),
    enabled: Boolean(unidadId),
  });
  const porDefecto: Record<AccionEnLaVivienda, boolean> = {
    registrar_visitas: true,
    reservar_zonas: true,
    invitar_a_la_vivienda: false,
  };
  const permisos = query.data ?? porDefecto;
  return {
    rolEnLaVivienda: unidad?.rol ?? null,
    puede: (accion: AccionEnLaVivienda) => permisos[accion],
  };
}
