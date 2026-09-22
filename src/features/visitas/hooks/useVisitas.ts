import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import {
  ESTADO_HACIA_BASE,
  actualizarEstadoVisita,
  actualizarInvitado as actualizarInvitadoRepo,
  actualizarVisita as actualizarVisitaRepo,
  crearVisita,
  eliminarVisita,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarAnuncio,
  registrarHoraInvitado,
  verificarDocumentoInvitado,
  type NuevaVisita,
} from "../services/visitas.repo";

export const VISITAS_QUERY_KEY = ["visitas"];

/**
 * Única fuente de verdad de las visitas.
 *
 * Antes existían dos: un store de Zustand con los datos y React Query
 * consultándolo a sí mismo. Ahora los datos viven en Supabase y React Query es
 * la caché; cada mutación invalida la consulta y la lista se refresca sola.
 *
 * Todas las operaciones sobre invitados reciben el uuid del invitado, nunca su
 * posición en el array: borrar o reordenar un invitado ya no puede desplazar
 * silenciosamente los datos de otra persona.
 */
export function useVisitas() {
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const query = useQuery({
    queryKey: VISITAS_QUERY_KEY,
    queryFn: obtenerVisitas,
  });

  const invalidar = () => {
    void client.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
  };

  const alFallar = (error: unknown) => {
    addToast(
      error instanceof Error ? error.message : "No se pudo guardar el cambio",
      "error",
    );
  };

  const crear = useMutation({
    mutationFn: (datos: NuevaVisita) => crearVisita(datos),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ uuid, estado }: { uuid: string; estado: string }) =>
      actualizarEstadoVisita(uuid, ESTADO_HACIA_BASE[estado] ?? "programada"),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const eliminar = useMutation({
    mutationFn: (uuid: string) => eliminarVisita(uuid),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const actualizar = useMutation({
    mutationFn: ({
      uuid,
      patch,
    }: {
      uuid: string;
      patch: Parameters<typeof actualizarVisitaRepo>[1];
    }) => actualizarVisitaRepo(uuid, patch),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const anunciar = useMutation({
    mutationFn: ({ uuid, anunciada }: { uuid: string; anunciada: boolean }) =>
      registrarAnuncio(uuid, anunciada),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const marcarLlegada = useMutation({
    mutationFn: ({
      invitadoUuid,
      llego,
    }: {
      invitadoUuid: string;
      llego: boolean;
    }) => marcarLlegadaInvitado(invitadoUuid, llego),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const registrarHora = useMutation({
    mutationFn: ({
      invitadoUuid,
      momento,
      hora,
    }: {
      invitadoUuid: string;
      momento: "ingreso" | "salida";
      hora: string;
    }) => registrarHoraInvitado(invitadoUuid, momento, hora),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const editarInvitado = useMutation({
    mutationFn: ({
      invitadoUuid,
      patch,
    }: {
      invitadoUuid: string;
      patch: Parameters<typeof actualizarInvitadoRepo>[1];
    }) => actualizarInvitadoRepo(invitadoUuid, patch),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const verificarDocumento = useMutation({
    mutationFn: (invitadoUuid: string) => verificarDocumentoInvitado(invitadoUuid),
    onSuccess: invalidar,
    onError: alFallar,
  });

  return {
    items: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    refrescar: query.refetch,

    crearVisita: crear.mutate,
    creando: crear.isPending,
    actualizarEstado: (uuid: string, estado: string) =>
      cambiarEstado.mutate({ uuid, estado }),
    eliminarVisita: (uuid: string) => eliminar.mutate(uuid),
    actualizarVisita: (
      uuid: string,
      patch: Parameters<typeof actualizarVisitaRepo>[1],
    ) => actualizar.mutate({ uuid, patch }),
    registrarAnuncio: (uuid: string, anunciada: boolean) =>
      anunciar.mutate({ uuid, anunciada }),

    marcarLlegadaInvitado: (invitadoUuid: string, llego: boolean) =>
      marcarLlegada.mutate({ invitadoUuid, llego }),
    registrarHoraInvitado: (
      invitadoUuid: string,
      momento: "ingreso" | "salida",
      hora: string,
    ) => registrarHora.mutate({ invitadoUuid, momento, hora }),
    verificarDocumentoInvitado: (invitadoUuid: string) =>
      verificarDocumento.mutate(invitadoUuid),
    actualizarInvitado: (
      invitadoUuid: string,
      patch: Parameters<typeof actualizarInvitadoRepo>[1],
    ) => editarInvitado.mutate({ invitadoUuid, patch }),
  };
}
