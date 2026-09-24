import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import {
  ESTADO_HACIA_BASE,
  actualizarEstadoVisita,
  actualizarInvitado as actualizarInvitadoRepo,
  actualizarVisita as actualizarVisitaRepo,
  adjuntarFotosVisita,
  crearVisita,
  eliminarVisita,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarAnuncio,
  registrarHoraInvitado,
  aceptarTerminosHuesped,
  comprarPaqueteVerificaciones,
  reportarTraSire,
  verificarAntecedentes,
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

  /*
    Las fotos suben al bucket privado antes de tocar la fila: lo que se guarda
    es la ruta, no la URI local del selector --que en web es un `blob:` de la
    pestaña y muere al recargar--.
  */
  const adjuntarFotos = useMutation({
    mutationFn: ({
      uuid,
      uris,
      momento,
    }: {
      uuid: string;
      uris: string[];
      momento: "ingreso" | "salida";
    }) => adjuntarFotosVisita(uuid, uris, momento),
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

  /**
   * El reporte ante la autoridad de turismo.
   *
   * El botón existía y llamaba a `onUpdateInvitado(index, { traSireReported:
   * true })`: marcaba el estado local y no escribía en ningún sitio. La base
   * comprueba lo que el KT manda —ingreso confirmado por la portería y RNT
   * vigente—, así que aquí solo hay que dejar pasar su mensaje si rechaza.
   */
  const reportarTra = useMutation({
    mutationFn: ({
      invitadoUuid,
      movimiento,
    }: {
      invitadoUuid: string;
      movimiento: "entrada" | "salida";
    }) => reportarTraSire({ invitadoUuid, movimiento }),
    onSuccess: invalidar,
    onError: alFallar,
  });

  /**
   * Los T&C del huésped, y la excepción que el anfitrión asume.
   *
   * Los botones estaban y solo tocaban el estado local: la excepción se
   * perdía al recargar, y con ella el registro de quién la había asumido.
   */
  const aceptarTerminos = useMutation({
    mutationFn: ({
      invitadoUuid,
      porExcepcion,
    }: {
      invitadoUuid: string;
      porExcepcion?: boolean;
    }) => aceptarTerminosHuesped({ invitadoUuid, porExcepcion }),
    onSuccess: invalidar,
    onError: alFallar,
  });

  /**
   * La verificación de antecedentes. Descuenta del saldo, y sin proveedor
   * configurado queda marcada como simulada en la propia base.
   */
  const verificarAntecedentesMut = useMutation({
    mutationFn: ({
      invitadoUuid,
      conHallazgos,
    }: {
      invitadoUuid: string;
      conHallazgos?: boolean;
    }) => verificarAntecedentes({ invitadoUuid, conHallazgos }),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const comprarPaquete = useMutation({
    mutationFn: ({
      unidadId,
      cantidad,
    }: {
      unidadId: string;
      cantidad: number;
    }) => comprarPaqueteVerificaciones({ unidadId, cantidad }),
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
    adjuntarFotosVisita: (
      uuid: string,
      uris: string[],
      momento: "ingreso" | "salida",
    ) => adjuntarFotos.mutate({ uuid, uris, momento }),

    marcarLlegadaInvitado: (invitadoUuid: string, llego: boolean) =>
      marcarLlegada.mutate({ invitadoUuid, llego }),
    registrarHoraInvitado: (
      invitadoUuid: string,
      momento: "ingreso" | "salida",
      hora: string,
    ) => registrarHora.mutate({ invitadoUuid, momento, hora }),
    verificarDocumentoInvitado: (invitadoUuid: string) =>
      verificarDocumento.mutate(invitadoUuid),
    aceptarTerminos: (invitadoUuid: string, porExcepcion = false) =>
      aceptarTerminos.mutate({ invitadoUuid, porExcepcion }),
    verificarAntecedentes: (invitadoUuid: string, conHallazgos = false) =>
      verificarAntecedentesMut.mutate({ invitadoUuid, conHallazgos }),
    comprarPaquete: (unidadId: string, cantidad: number) =>
      comprarPaquete.mutate({ unidadId, cantidad }),
    comprandoPaquete: comprarPaquete.isPending,
    reportarTraSire: (
      invitadoUuid: string,
      movimiento: "entrada" | "salida",
    ) => reportarTra.mutate({ invitadoUuid, movimiento }),
    reportandoTraSire: reportarTra.isPending,
    actualizarInvitado: (
      invitadoUuid: string,
      patch: Parameters<typeof actualizarInvitadoRepo>[1],
    ) => editarInvitado.mutate({ invitadoUuid, patch }),
  };
}
