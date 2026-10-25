import { useQuery } from "@tanstack/react-query";
import {
  documentosDelEdificio,
  documentosParaRegistrarse,
  type ReglaDeDocumento,
} from "@/shared/services/documentos.repo";

/**
 * Los documentos que se piden en el país del edificio, con sus reglas. Los
 * cambia el dueño de la plataforma (Más → Países), así que no se guardan para
 * siempre: una hora basta para no pedirlos en cada pantalla.
 */
export function useDocumentosDelEdificio(condominioId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["catalogo", "documentos", "edificio", condominioId],
    queryFn: () => documentosDelEdificio(condominioId ?? ""),
    enabled: Boolean(condominioId),
    staleTime: 60 * 60 * 1000,
  });
  return conLaRegla(data, isLoading);
}

/** Los que se ofrecen al crear una cuenta. */
export function useDocumentosParaRegistrarse() {
  const { data, isLoading } = useQuery({
    queryKey: ["catalogo", "documentos", "registro"],
    queryFn: documentosParaRegistrarse,
    staleTime: 60 * 60 * 1000,
  });
  return conLaRegla(data, isLoading);
}

function conLaRegla(data: ReglaDeDocumento[] | undefined, cargando: boolean) {
  const reglas = data ?? [];
  return {
    reglas,
    cargando,
    listo: data !== undefined,
    reglaDe: (tipo: string | null | undefined) => reglas.find((r) => r.tipo === tipo) ?? null,
  };
}
