import { useQuery } from "@tanstack/react-query";
import { obtenerLegalesDePlataforma } from "../services/legales.repo";

/**
 * Los documentos legales de la plataforma.
 *
 * Se leen sin sesión a propósito: la pantalla que los muestra está en el stack
 * de autenticación, porque aceptarlos es parte de registrarse.
 */
export function useDocumentosLegales() {
  const query = useQuery({
    queryKey: ["documentos-legales"],
    queryFn: obtenerLegalesDePlataforma,
  });

  return {
    documentos: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
  };
}
