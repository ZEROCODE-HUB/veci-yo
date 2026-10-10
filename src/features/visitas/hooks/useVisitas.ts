import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores";
import { useUnidadesDelRolActivo } from "@/shared/hooks";
import {
  ESTADO_HACIA_BASE,
  actualizarEstadoVisita,
  actualizarInvitado as actualizarInvitadoRepo,
  actualizarVisita as actualizarVisitaRepo,
  adjuntarFotosVisita,
  crearVisita,
  eliminarVisita,
  horarioDeCheckin,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarAnuncio,
  registrarHoraInvitado,
  aceptarTerminosHuesped,
  comprarPaqueteVerificaciones,
  reportarTraSire,
  verificarAntecedentes,
  type AmbitoVisitas,
  type NuevaVisita,
} from "../services/visitas.repo";
import {
  subirFotoDePorteria,
  verificarEnPorteria,
} from "../services/porteria.repo";
import { fotoEnBase64, olvidarFoto } from "../services/porteriaArchivo";
import { mensajeDeError } from "@/shared/utils/error.util";
import { fueraDeLaFranja } from "../helpers/fueraDeLaFranja";
import type { VisitaItem } from "@/shared/types";
import { formatTime } from "@/shared/utils";

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

  /*
    El ambito lo decide **el rol con el que se entro**, no la identidad.

    Marcela administra el condominio y ademas es propietaria de la 301: al
    entrar como propietaria veia las visitas de las demas viviendas --en la
    lista de la 301 aparecia una visita de la 205-- porque la consulta pedia
    todo lo que RLS le permite. Es lo que la regla 8 llama «pedir de mas»: la
    politica no filtra por rol activo porque no lo conoce.
  */
  const rolActivo = useAuthStore((s) => s.rolActivo);
  /*
    Las unidades **de las que la persona es miembro**, que vienen en la sesion.

    No las de `useUnidadesDisponibles`: ese hook devuelve todas las del
    condominio --lo dice su propio comentario, y es correcto para lo que hace,
    llenar los desplegables de torre y departamento--. Usarlo aqui dejaba el
    filtro sin efecto, y la 205 seguia saliendo en la lista de la 301. Lo pillo
    el navegador despues de que el typecheck y las pruebas pasaran.
  */
  const ambito: AmbitoVisitas =
    rolActivo === "guardia" || rolActivo === "administrador"
      ? "condominio"
      : "unidad";
  /*
    Las del **rol activo**, no todas las suyas. Laura es inquilina lider de la
    205 y huesped de la 102: al entrar como huesped, su lista enseñaba una
    visita de la 205 con la cabecera diciendo «Torre 1 · 102».
  */
  const unidadIds = useUnidadesDelRolActivo();

  const query = useQuery({
    // El ambito y las unidades entran en la clave: al cambiar de rol sin salir
    // de la pantalla, la lista se vuelve a pedir en vez de servir la de antes.
    queryKey: [...VISITAS_QUERY_KEY, ambito, ...unidadIds],
    queryFn: () => obtenerVisitas({ ambito, unidadIds }),
  });

  /*
    Una visita no solo cambia la lista de visitas.

    Registrar la llegada o la salida mueve tres cosas mas, y ninguna vive bajo
    `["visitas"]`, asi que la pantalla de inicio de la porteria se quedaba
    contando lo de antes: el guardia registraba la entrada, volvia a Inicio y
    seguia leyendo «Programado» y «0 de 1 disponibles» hasta recargar la
    pagina. Un guardia que ve eso vuelve a registrar.

    - `["home", ...]`: el cuadro «Ingresos y salidas» y el trafico del dia.
    - `["condominio", "arquitectura", ...]`: de ahi sale el contador de
      estacionamientos de visita, porque un disparador suelta el cupo al
      terminar la visita --la app no escribe esa fila, y por eso nadie
      invalidaba nada--.
  */
  const invalidar = () => {
    void client.invalidateQueries({ queryKey: VISITAS_QUERY_KEY });
    void client.invalidateQueries({ queryKey: ["home"] });
    void client.invalidateQueries({ queryKey: ["condominio", "arquitectura"] });
  };

  const alFallar = (error: unknown) => {
    addToast(
      mensajeDeError(error, "No se pudo guardar el cambio"),
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

  /*
    La porteria marca que alguien llego. Si es un huesped temporal y la vivienda
    tiene horario de check-in, se comprueba la hora y se avisa.

    **Aviso y no bloqueo**, que es el criterio que el cliente ya fijo para el
    aforo: un vuelo se retrasa y la porteria no puede dejar a nadie en la
    puerta. Lo que hace falta es que el guardia lo sepa.

    Va despues de guardar y no antes: la llegada se registra pase lo que pase, y
    si el horario no se puede leer --un corte, un permiso-- se calla, porque un
    aviso que no sale no puede impedir que alguien entre.
  */
  const avisarSiLlegaFueraDeHora = async (visita?: VisitaItem) => {
    if (!visita || visita.tipo !== "huesped-temporal" || !visita.unidadId) {
      return;
    }

    try {
      const { desde, hasta } = await horarioDeCheckin(visita.unidadId);
      if (fueraDeLaFranja(formatTime(new Date()), desde, hasta)) {
        addToast(
          `Llega fuera del horario de check-in de esta vivienda (de ${desde!.slice(0, 5)} a ${hasta!.slice(0, 5)})`,
          "error",
        );
      }
    } catch {
      // Sin horario legible no hay nada que avisar.
    }
  };

  const marcarLlegada = useMutation({
    mutationFn: ({
      invitadoUuid,
      llego,
    }: {
      invitadoUuid: string;
      llego: boolean;
      visita?: VisitaItem;
    }) => marcarLlegadaInvitado(invitadoUuid, llego),
    onSuccess: (_datos, variables) => {
      invalidar();
      if (variables.llego) void avisarSiLlegaFueraDeHora(variables.visita);
    },
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

  /*
    El guardia teclea el numero y **la base dice si coincide**. Antes lo
    decidia la pantalla y aqui solo se anotaba el resultado.
  */
  const verificarDocumento = useMutation({
    mutationFn: ({
      invitadoUuid,
      numero,
    }: {
      invitadoUuid: string;
      numero: string;
    }) => verificarEnPorteria(invitadoUuid, numero),
    onSuccess: invalidar,
    onError: alFallar,
  });

  const fotoDePorteria = useMutation({
    mutationFn: async ({
      invitadoUuid,
      uri,
    }: {
      invitadoUuid: string;
      uri: string;
    }) => {
      try {
        return await subirFotoDePorteria(invitadoUuid, await fotoEnBase64(uri));
      } finally {
        // Se guarde o no: la foto de un documento ajeno no se queda aqui.
        olvidarFoto(uri);
      }
    },
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

    marcarLlegadaInvitado: (
      invitadoUuid: string,
      llego: boolean,
      visita?: VisitaItem,
    ) =>
      marcarLlegada.mutate({ invitadoUuid, llego, visita }),
    registrarHoraInvitado: (
      invitadoUuid: string,
      momento: "ingreso" | "salida",
      hora: string,
    ) => registrarHora.mutate({ invitadoUuid, momento, hora }),
    verificarEnPorteria: (invitadoUuid: string, numero: string) =>
      verificarDocumento.mutateAsync({ invitadoUuid, numero }),
    subirFotoDePorteria: async (invitadoUuid: string, uri: string) => {
      await fotoDePorteria.mutateAsync({ invitadoUuid, uri });
    },
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
