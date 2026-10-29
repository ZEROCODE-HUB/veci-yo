import { useMemo } from "react";
import { formatoDeLaFila, type SitioDeArchivo } from "@/shared/constants/formatosDeArchivo";
import { useLista } from "./useLista";

/**
 * Para la pantalla: qué tipos acepta un sitio y cómo decirlo antes de que
 * alguien elija el archivo. Lo mismo que `formatoDeArchivo`, con React Query.
 */
export function useFormatoDeArchivo(sitio: SitioDeArchivo) {
  const { opcion } = useLista("archivo_formatos");
  return useMemo(
    () => formatoDeLaFila(sitio, opcion(sitio)?.extra),
    [opcion, sitio],
  );
}
