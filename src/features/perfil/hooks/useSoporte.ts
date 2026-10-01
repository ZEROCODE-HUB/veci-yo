import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import {
  obtenerContactoSoporte,
  obtenerPreguntasFrecuentes,
} from "../services";

export function usePreguntasFrecuentes() {
  const condominioId = useCondominioActivo() ?? "";

  const query = useQuery({
    queryKey: ["soporte", "faq", condominioId],
    queryFn: () => obtenerPreguntasFrecuentes(condominioId),
    enabled: Boolean(condominioId),
  });

  const preguntas = query.data ?? [];

  return {
    preguntas,
    cargando: query.isLoading,
    // Las categorías salen de las preguntas que existan: antes eran tres
    // fijas, y una de ellas ("Puntos") describía algo que el producto no tiene.
    categorias: [...new Set(preguntas.map((p) => p.categoria))],
  };
}

export function useContactoSoporte() {
  const condominioId = useCondominioActivo() ?? "";

  const query = useQuery({
    queryKey: ["soporte", "contacto", condominioId],
    queryFn: () => obtenerContactoSoporte(condominioId),
    enabled: Boolean(condominioId),
  });

  return { contacto: query.data, cargando: query.isLoading };
}
