import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils";
import {
  eliminarPreguntaFrecuente,
  guardarPreguntaFrecuente,
  obtenerContactoSoporte,
  obtenerPreguntasFrecuentes,
} from "../services";
import type { FormularioPregunta } from "../components/soporte";

export function usePreguntasFrecuentes() {
  const condominioId = useCondominioActivo() ?? "";

  const query = useQuery({
    queryKey: ["soporte", "faq", condominioId],
    queryFn: () => obtenerPreguntasFrecuentes(condominioId),
    enabled: Boolean(condominioId),
  });

  const preguntas = query.data ?? [];
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  // Las escribe la administración (16/10/2026); la base lo vuelve a mirar.
  const puedeEditar = useAuthStore((s) => s.rolActivo) === "administrador";

  const alTerminar = (texto: string) => ({
    onSuccess: () => {
      addToast(texto, "success");
      void cliente.invalidateQueries({ queryKey: ["soporte", "faq"] });
    },
    onError: (fallo: unknown) =>
      addToast(mensajeDeError(fallo, "No se pudo guardar"), "error"),
  });

  const guardar = useMutation({
    mutationFn: ({ id, form }: { id?: string; form: FormularioPregunta }) =>
      guardarPreguntaFrecuente(condominioId, {
        id,
        ...form,
        orden: preguntas.length + 1,
      }),
    ...alTerminar("Pregunta guardada"),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarPreguntaFrecuente(id),
    ...alTerminar("Pregunta eliminada"),
  });

  return {
    preguntas,
    cargando: query.isLoading,
    puedeEditar,
    guardar,
    eliminar,
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
