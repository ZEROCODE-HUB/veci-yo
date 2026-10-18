import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "./useCondominioActivo";
import { obtenerParametrosPublicos } from "@/shared/services/parametros.repo";
import {
  parametroBooleano,
  parametroLista,
  parametroNumero,
  parametroTexto,
  type MapaDeParametros,
} from "@/shared/services/parametros";

/**
 * Los parámetros de la base, con el valor del edificio activo.
 *
 * Mientras no han llegado, `listo` es false y la pantalla espera: no hay valor
 * de respaldo escrito aquí a propósito (ver `parametros.ts`).
 */
export function useParametrosDeLaBase() {
  const condominioId = useCondominioActivo() ?? undefined;

  const { data, error } = useQuery({
    queryKey: ["parametros", condominioId ?? "sin-edificio"],
    queryFn: () => obtenerParametrosPublicos(condominioId),
    // Cambian desde el panel de Supabase, muy de vez en cuando.
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const mapa: MapaDeParametros = data ?? {};
    return {
      listo: Boolean(data),
      error,
      numero: (clave: string) => parametroNumero(mapa, clave),
      texto: (clave: string) => parametroTexto(mapa, clave),
      booleano: (clave: string) => parametroBooleano(mapa, clave),
      lista: <T = unknown>(clave: string) => parametroLista<T>(mapa, clave),
    };
  }, [data, error]);
}
