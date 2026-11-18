import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { descartarPaso, obtenerPasosDescartados } from "../services/pasosDescartados.repo";

const CLAVE = ["inicio", "pasos-descartados"];

/** Lo que cada uno quitó de su tarjeta de pasos (18/11/2026). */
export function usePasosDescartados() {
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const consulta = useQuery({ queryKey: CLAVE, queryFn: obtenerPasosDescartados });
  const descartar = useMutation({
    mutationFn: descartarPaso,
    // Se quita de la vista al momento; si la base no lo guarda, vuelve y se dice.
    onMutate: (paso) => {
      cliente.setQueryData<string[]>(CLAVE, (antes = []) => [...antes, paso]);
    },
    onError: (e) => {
      void cliente.invalidateQueries({ queryKey: CLAVE });
      addToast(mensajeDeError(e, "No se pudo quitar"), "error");
    },
  });
  return {
    descartados: consulta.data ?? [],
    descartar: (paso: string) => descartar.mutate(paso),
  };
}
