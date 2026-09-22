import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useCondominioActivo } from "@/shared/hooks";
import {
  cambiarEstadoReclamo,
  crearReclamo,
  obtenerReclamos,
  type NuevoReclamo,
} from "../services/pqrs.repo";

export const RECLAMOS_QUERY_KEY = ["perfil", "reclamos"];

export function useReclamos() {
  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const usuario = useAuthStore((s) => s.usuario);
  const unidades = useAuthStore((s) => s.unidades);
  const condominioId = useCondominioActivo() ?? "";

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: RECLAMOS_QUERY_KEY });

  // La lectura no filtra por condominio: la política `reclamo_lectura` ya
  // devuelve las propias y, a la administración, las de su condominio.
  const query = useQuery({
    queryKey: RECLAMOS_QUERY_KEY,
    queryFn: obtenerReclamos,
  });

  const crear = useMutation({
    mutationFn: (datos: NuevoReclamo) =>
      crearReclamo({
        datos,
        condominioId,
        unidadId: unidades[0]?.unidadId ?? null,
        usuarioId,
        nombre: [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" "),
      }),
    onSuccess: refrescar,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      cambiarEstadoReclamo({ id, estado, usuarioId }),
    onSuccess: refrescar,
  });

  const resolver = useMutation({
    mutationFn: ({
      id,
      estado,
      mensaje,
    }: {
      id: string;
      estado: string;
      mensaje: string;
    }) =>
      cambiarEstadoReclamo({ id, estado, resolucion: mensaje, usuarioId }),
    onSuccess: refrescar,
  });

  return {
    ...query,
    reclamos: query.data ?? [],
    crear,
    cambiarEstado,
    resolver,
  };
}
