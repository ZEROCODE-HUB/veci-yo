import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { indiceDelEdificio } from "../services/anuncios.repo";

/** Cuánto suma el índice de votación del edificio activo (18/11/2026). */
export function useIndiceDelEdificio(activo: boolean) {
  const condominioId = useCondominioActivo() ?? "";
  const { data } = useQuery({
    queryKey: ["indice-de-votacion", condominioId],
    queryFn: () => indiceDelEdificio(condominioId),
    enabled: activo && condominioId !== "",
    // Al abrir el formulario se vuelve a preguntar: pudo cambiar en Arquitectura.
    staleTime: 0,
  });
  return data ?? null;
}
