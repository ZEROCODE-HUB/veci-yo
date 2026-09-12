import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  eliminarResidente,
  actualizarResidente,
  crearResidente,
  obtenerResidentes,
} from "../services/propietario.service";
import { usePropietarioStore } from "@/stores/propietario-store";
import type { Residente } from "@/shared/types";

export const RESIDENTES_QUERY_KEY = ["propietario", "residentes"];

export function usePropietarioResidentes() {
  const queryClient = useQueryClient();
  const residentesLocales = usePropietarioStore((state) => state.residentes);
  const query = useQuery({
    queryKey: RESIDENTES_QUERY_KEY,
    queryFn: obtenerResidentes,
  });
  const crear = useMutation({
    mutationFn: (datos: Omit<Residente, "id"> & Record<string, unknown>) =>
      crearResidente(datos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: RESIDENTES_QUERY_KEY }),
  });
  const actualizar = useMutation({
    mutationFn: (
      datos: Partial<Residente> & { id: number; [key: string]: unknown },
    ) => actualizarResidente(datos),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: RESIDENTES_QUERY_KEY }),
  });
  const eliminar = useMutation({
    mutationFn: (id: number) => eliminarResidente(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: RESIDENTES_QUERY_KEY }),
  });
  return {
    ...query,
    residentes: query.data ?? residentesLocales,
    crear,
    actualizar,
    eliminar,
  };
}
