import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useCondominioActivo } from "@/shared/hooks";
import {
  cambiarEstadoReclamo,
  crearReclamo,
  obtenerReclamos,
  type NuevoReclamo,
} from "../services/pqrs.repo";
import type { ArchivoElegido } from "@/shared/services/archivos";

export const RECLAMOS_QUERY_KEY = ["perfil", "reclamos"];

export function useReclamos() {
  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuario = useAuthStore((s) => s.usuario);
  const unidades = useAuthStore((s) => s.unidades);
  const condominioId = useCondominioActivo() ?? "";

  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: RECLAMOS_QUERY_KEY });

  // El ámbito lo decide el rol con el que se entró, no la identidad: quien
  // administra el condominio y además vive en él ve solo las suyas mientras
  // esté operando como propietario (R-24).
  const ambito = rolActivo === "administrador" ? "condominio" : "propias";

  const query = useQuery({
    queryKey: [...RECLAMOS_QUERY_KEY, ambito, usuarioId],
    queryFn: () => obtenerReclamos({ ambito, usuarioId }),
    enabled: Boolean(usuarioId),
  });

  const crear = useMutation({
    mutationFn: ({
      datos,
      adjuntos,
    }: {
      datos: NuevoReclamo;
      adjuntos?: ArchivoElegido[];
    }) =>
      crearReclamo({
        datos,
        adjuntos,
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
