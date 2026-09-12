export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
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
  CorrespondenciaAgregar: { informar?: Record<string, unknown> } | undefined;
  Visitas: undefined;
  VisitasNuevo: { tipoPreseleccionado?: string } | undefined;
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
  Aceptar: { ubicacionId?: number; unidadId?: number };
  CrearRol: { editar?: any; rolPreseleccionado?: string };
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
  CrearRol: { editar?: any; rolPreseleccionado?: string };
  HistorialContrato: undefined;
  HuespedesTemporales: { from?: string } | undefined;
  AgregarServicio: undefined;
};
