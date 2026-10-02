import type { CorrespondenciaItem } from "./correspondencia";
import type { ResidenteAEditar } from "@/features/propietario/hooks/usePropietarioRol";
import type { VisitaItem } from "./visita";

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  /**
   * El panel de quien opera la plataforma.
   *
   * Hermano de `App` y no una pantalla dentro: este rol no tiene vivienda ni
   * condominio, así que no comparte ninguna pantalla con el resto. Colgarlo de
   * `App` habría puesto a su alcance la barra de viviendas y las pestañas del
   * edificio, que es justo lo que no puede ver.
   */
  Plataforma: undefined;
  SeleccionRol: undefined;
  AceptarInvitacion: { token: string };
};

/** Las pantallas del panel de la plataforma. */
export type PlataformaStackParamList = {
  PlataformaResumen: undefined;
  PlataformaEdificioNuevo: undefined;
  PlataformaSoporte: undefined;
  PlataformaSoporteDetalle: { id: string };
  PlataformaEquipo: undefined;
  PlataformaBitacora: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Registro: undefined;
  Verificacion: { correo: string };
  DemoRole: { rol: string };
  TerminosLegales: undefined;
};

export type AppTabsParamList = {
  InicioTab: undefined;
  ViviendaTab: undefined;
  PerfilTab: undefined;
};

export type SharedStackParamList = {
  Notificaciones: undefined;
  Configuracion: undefined;
  PropietarioConfiguracion: undefined;
  Correspondencia: undefined;
  /*
    El paquete que se va a informar, con su tipo: la pantalla que lo recibe
    lee `informar.uuid`, asi que `Record<string, unknown>` era mentira --y
    solo compilaba porque el `useRoute<any>` del otro lado lo tapaba--.
  */
  CorrespondenciaAgregar: { informar?: CorrespondenciaItem } | undefined;
  Visitas: undefined;
  VisitasNuevo: { tipoPreseleccionado?: VisitaItem["tipo"] } | undefined;
  ZonasComunes: undefined;
  ZonaDetalles: { zonaId: string };
  ZonaReservar: {
    zonaId: string;
    horaPre?: string;
    fechaPre?: string;
    deptoReserva?: string;
  };
  Reglas: undefined;
  ReglaDetalle: { tipo: string };
  Anuncios: undefined;
  AnuncioDetalle: { id: string };
  AdministradorUbicacion: undefined;
  AdministradorArquitectura: undefined;
  AdministradorPermisos: undefined;
  AdministradorSeguridad: undefined;
  AdministradorReportes: undefined;
  Coadministradores: undefined;
  AdministradorZonas: undefined;
  GestionZonas: undefined;
  GestionZonaForm: { id?: string };
  GestionZonaReservas: { id: string };
  Reclamos: undefined;
  ReclamoNuevo:
    | {
        categoriaPreseleccionada?: string;
        tituloPreseleccionado?: string;
        descripcionPreseleccionada?: string;
        departamentoDenunciado?: string;
      }
    | undefined;
  ReclamoDetalle: { id: string };
  Llamada: undefined;
  LlamadaEnCurso: { depto?: string; persona?: string } | undefined;
  Chat: undefined;
  ChatConversacion: { conversationId: string };
  ChatNuevo: undefined;
  Aceptar: { ubicacionId?: number; unidadId?: number };
  CrearRol: { editar?: ResidenteAEditar; rolPreseleccionado?: string };
  InvitarAUnidad: undefined;
  HistorialContrato: undefined;
  HuespedesTemporales: { from?: string } | undefined;
  AgregarServicio: undefined;
  CuadroHonor: undefined;
  Reputacion: undefined;
  InquilinoLiderUbicacion: undefined;
  MiAlojamiento: undefined;
  Comunidad: undefined;
  DirectorioPropiedades: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Notificaciones: undefined;
  Verificacion: undefined;
} & SharedStackParamList;

export type ViviendaStackParamList = {
  Vivienda: undefined;
} & SharedStackParamList;

export type PerfilStackParamList = {
  Perfil: undefined;
  Seguridad: undefined;
  SOS: undefined;
  Soporte: undefined;
  PreguntasFrecuentes: undefined;
  ContactoSoporte: undefined;
} & SharedStackParamList;

export type AdminStackParamList = {
  AdministracionUbicacion: undefined;
  Arquitectura: undefined;
  Permisos: undefined;
  Seguridad: undefined;
  Reportes: undefined;
  Coadministradores: undefined;
  Zonas: undefined;
  GestionZonas: undefined;
  GestionZonaForm: { id?: string };
  GestionZonaReservas: { id: string };
};

export type PropietarioStackParamList = {
  PropietarioConfiguracion: undefined;
  Aceptar: { ubicacionId?: number; unidadId?: number };
  CrearRol: { editar?: ResidenteAEditar; rolPreseleccionado?: string };
  InvitarAUnidad: undefined;
  HistorialContrato: undefined;
  HuespedesTemporales: { from?: string } | undefined;
  AgregarServicio: undefined;
};

/**
 * Todo lo que se puede alcanzar navegando desde cualquier pantalla.
 *
 * Los tres stacks --Inicio, Vivienda y Perfil-- registran las **mismas**
 * pantallas compartidas con `renderSharedScreens`, así que desde una de ellas se
 * llega a cualquier ruta compartida y también a las propias del stack en que se
 * esté. Esta unión es, literalmente, lo que la aplicación permite hacer.
 *
 * Existe porque había 42 `useNavigation<any>` y `useRoute<any>`: con `any`,
 * `navigate("PantallaQueNoExiste")` compila igual y el fallo aparece al pulsar,
 * como una pantalla en blanco. Y los parámetros tampoco se comprobaban: pasar
 * `{ id }` donde se espera `{ zonaId }` daba `undefined` dentro de la pantalla.
 */
export type NavegacionApp = HomeStackParamList &
  ViviendaStackParamList &
  PerfilStackParamList;
