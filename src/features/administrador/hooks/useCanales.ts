import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import {
  archivarCanal,
  guardarCanal,
  obtenerCanales,
  type Canal,
} from "../services/canales.repo";
import type { Database } from "@/shared/types/database.types";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];
type RolCondominio = Database["public"]["Enums"]["rol_condominio"];

export const CANALES_QUERY_KEY = ["administrador", "canales"];

/**
 * Los canales del chat del edificio, para la administración.
 *
 * `canales_del_condominio` devuelve vacío para quien no administra: la decisión
 * la toma la base y no este hook (regla 8 al revés, por una vez: aquí el ámbito
 * no se puede pedir de más).
 */
export function useCanales() {
  const condominioId = useCondominioActivo() ?? "";
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: [...CANALES_QUERY_KEY, condominioId],
    queryFn: () => obtenerCanales(condominioId),
    enabled: Boolean(condominioId),
  });

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: CANALES_QUERY_KEY });

  const guardar = useMutation({
    mutationFn: (params: {
      nombre: string;
      rolesVivienda: RolUnidad[];
      rolesEdificio: RolCondominio[];
      canalId?: string;
    }) => guardarCanal({ condominioId, ...params }),
    onSuccess: (_id, params) => {
      refrescar();
      addToast(params.canalId ? "Canal actualizado" : "Canal creado", "success");
    },
    // El motivo, no un texto genérico: la base dice «El canal necesita al menos
    // un rol» y «Ese canal ya existe», y los dos se arreglan sabiéndolos.
    onError: (error: Error) => addToast(error.message, "error"),
  });

  const archivar = useMutation({
    mutationFn: (params: { canalId: string; archivar: boolean }) =>
      archivarCanal(params),
    onSuccess: (_r, params) => {
      refrescar();
      addToast(
        params.archivar
          ? "Canal archivado. Lo dicho en él se conserva."
          : "Canal recuperado",
        "success",
      );
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    canales: query.data ?? [],
    cargando: query.isLoading,
    guardando: guardar.isPending,
    guardar: (params: {
      nombre: string;
      rolesVivienda: RolUnidad[];
      rolesEdificio: RolCondominio[];
      canalId?: string;
    }) => guardar.mutate(params),
    archivar: (canal: Canal) =>
      archivar.mutate({ canalId: canal.id, archivar: !canal.archivado }),
  };
}
