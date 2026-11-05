import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  obtenerErroresDeLaApp,
  obtenerVecesDeUnError,
  type TipoDeAnotacion,
} from "../services/erroresDeLaApp.repo";
import { PLATAFORMA_QUERY_KEY } from "./usePlataforma";

/** Los últimos días que mira el panel. */
export const DIAS_DE_ERRORES = 7;

/** Los errores de la app agrupados por dónde pasaron (05/11/2026). */
export function useErroresDeLaApp(tipo: TipoDeAnotacion) {
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);
  const query = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "errores", tipo, DIAS_DE_ERRORES],
    queryFn: () => obtenerErroresDeLaApp(DIAS_DE_ERRORES, tipo),
    enabled: Boolean(rolPlataforma),
  });
  return {
    grupos: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    refrescar: query.refetch,
    refrescando: query.isRefetching,
  };
}

/** Las últimas veces de un error, al abrir su grupo. */
export function useVecesDeUnError(donde: string | null, tipo: TipoDeAnotacion) {
  const query = useQuery({
    queryKey: [...PLATAFORMA_QUERY_KEY, "errores", tipo, DIAS_DE_ERRORES, donde],
    queryFn: () => obtenerVecesDeUnError(donde ?? "", DIAS_DE_ERRORES, tipo),
    enabled: donde !== null,
  });
  return { veces: query.data ?? [], cargando: query.isLoading, error: query.error };
}
