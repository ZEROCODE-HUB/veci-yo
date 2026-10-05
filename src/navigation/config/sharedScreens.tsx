import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavegacionApp } from "@/shared/types";
import { CorrespondenciaScreen } from "@/features/correspondencia/screens/CorrespondenciaScreen";
import { CorrespondenciaAgregarScreen } from "@/features/correspondencia/screens/CorrespondenciaAgregarScreen";
import {
  VisitasHistorialScreen,
  VisitasNuevoScreen,
} from "@/features/visitas/screens";
import {
  ZonasComunesScreen,
  ZonaDetallesScreen,
  ZonaReservarScreen,
} from "@/features/zonas/screens";
import { ReglaDetalleScreen } from "@/features/reglas/screens/ReglaDetalleScreen";
import { ReglasScreen } from "@/features/reglas/screens/ReglasScreen";
import { ReclamosScreen } from "@/features/perfil/screens/ReclamosScreen";
import { ReclamoNuevoScreen } from "@/features/perfil/screens/ReclamoNuevoScreen";
import { ReclamoDetalleScreen } from "@/features/perfil/screens/ReclamoDetalleScreen";
import {
  AdministradorUbicacionScreen,
  AdministradorArquitecturaScreen,
  AdministradorPermisosScreen,
  AdministradorSeguridadScreen,
  AdministradorCanalesScreen,
  AdministradorReportesScreen,
  CoadministradoresScreen,
  AdministradorGestionZonasScreen,
  AdministradorGestionZonaFormScreen,
  AdministradorGestionZonaReservasScreen,
} from "@/features/administrador/screens";
import { ConfiguracionScreen } from "@/features/perfil/screens/ConfiguracionScreen";
import { PropietarioConfiguracionScreen } from "@/features/propietario/screens/PropietarioConfiguracionScreen";
import { PropietarioAceptacionScreen } from "@/features/propietario/screens/PropietarioAceptacionScreen";
import { PropietarioCrearRolScreen } from "@/features/propietario/screens/PropietarioCrearRolScreen";
import { PropietarioInvitarScreen } from "@/features/propietario/screens/PropietarioInvitarScreen";
import { PropietarioHistorialContratoScreen } from "@/features/propietario/screens/PropietarioHistorialContratoScreen";
import { PropietarioHuespedesTemporalesScreen } from "@/features/propietario/screens/PropietarioHuespedesTemporalesScreen";
import { AdministracionUbicacionScreen } from "@/features/inquilino-lider/screens/AdministracionUbicacionScreen";
import { CuadroHonorScreen } from "@/features/inquilino-lider/screens/CuadroHonorScreen";
import { ReputacionScreen } from "@/features/inquilino-lider/screens/ReputacionScreen";
import {
  AnunciosScreen,
  AnuncioDetalleScreen,
} from "@/features/anuncios/screens";
import { MiAlojamientoScreen } from "@/features/huesped/screens";
import { DirectorioPropiedadesScreen } from "@/features/directorio/screens";
import { CallScreen } from "@/features/home/screens/CallScreen";
import { CallInProgressScreen } from "@/features/home/screens/CallInProgressScreen";
import { ChatScreen } from "@/features/home/screens/ChatScreen";
import { ChatConversacionScreen } from "@/features/home/screens/ChatConversacionScreen";
import { ChatNuevoScreen } from "@/features/home/screens/ChatNuevoScreen";
import { NotificacionesScreen } from "@/features/home/screens/NotificacionesScreen";

/*
  El navegador, con **su** tipo y no con uno escrito a mano: los tres stacks lo
  crean con `createNativeStackNavigator` sobre su propio `ParamList`, asi que
  describirlo aqui a mano era inventar una segunda version que no encajaba con
  ninguno de los tres.
*/
type StackNavigator = {
  Screen: ReturnType<typeof createNativeStackNavigator>["Screen"];
};

/*
  `name` se comprueba contra las rutas declaradas: registrar una pantalla con un
  nombre que no esta en el `ParamList` --o escrito con una letra de mas-- deja de
  compilar, en vez de dar una pantalla en blanco al navegar a ella.

  Y el componente no lleva genérico porque las pantallas de este proyecto no
  reciben props: la navegación y los parámetros los piden con `useNavegacion` y
  `useParametros`.
*/
type SharedScreenDefinition = {
  name: keyof NavegacionApp;
  component: React.ComponentType;
  options?: Record<string, unknown>;
};

const SHARED_SCREENS: SharedScreenDefinition[] = [
  {
    name: "Notificaciones",
    component: NotificacionesScreen,
    options: { title: "Notificaciones" },
  },
  {
    name: "Configuracion",
    component: ConfiguracionScreen,
    options: { title: "Configuración" },
  },
  {
    name: "PropietarioConfiguracion",
    component: PropietarioConfiguracionScreen,
    options: { title: "Configuración" },
  },
  {
    name: "Correspondencia",
    component: CorrespondenciaScreen,
    options: { title: "Correspondencia" },
  },
  {
    name: "CorrespondenciaAgregar",
    component: CorrespondenciaAgregarScreen,
    options: { headerShown: false },
  },
  {
    name: "Visitas",
    component: VisitasHistorialScreen,
    options: { title: "Visitas" },
  },
  {
    name: "VisitasNuevo",
    component: VisitasNuevoScreen,
    options: { title: "Visitas" },
  },
  {
    name: "ZonasComunes",
    component: ZonasComunesScreen,
    options: { title: "Zonas Comunes" },
  },
  {
    name: "ZonaDetalles",
    component: ZonaDetallesScreen,
    options: { headerShown: false },
  },
  {
    name: "ZonaReservar",
    component: ZonaReservarScreen,
    options: { headerShown: false },
  },
  {
    name: "Reglas",
    component: ReglasScreen,
    options: { title: "Reglamentos y renta corta" },
  },
  {
    name: "ReglaDetalle",
    component: ReglaDetalleScreen,
    options: { headerShown: false },
  },
  {
    name: "Anuncios",
    component: AnunciosScreen,
    options: { title: "Anuncios" },
  },
  {
    name: "AnuncioDetalle",
    component: AnuncioDetalleScreen,
    options: { title: "Anuncio" },
  },
  {
    name: "AdministradorUbicacion",
    component: AdministradorUbicacionScreen,
    options: { headerShown: false },
  },
  {
    name: "AdministradorArquitectura",
    component: AdministradorArquitecturaScreen,
    options: { headerShown: false },
  },
  {
    name: "AdministradorPermisos",
    component: AdministradorPermisosScreen,
    options: { headerShown: false },
  },
  {
    name: "AdministradorSeguridad",
    component: AdministradorSeguridadScreen,
    options: { headerShown: false },
  },
  {
    name: "AdministradorCanales",
    component: AdministradorCanalesScreen,
    options: { title: "Canales del chat" },
  },
  {
    name: "AdministradorReportes",
    component: AdministradorReportesScreen,
    options: { headerShown: false },
  },
  {
    name: "Coadministradores",
    component: CoadministradoresScreen,
    options: { headerShown: false },
  },
  {
    name: "GestionZonas",
    component: AdministradorGestionZonasScreen,
    options: { headerShown: false },
  },
  {
    name: "GestionZonaForm",
    component: AdministradorGestionZonaFormScreen,
    options: { headerShown: false },
  },
  {
    name: "GestionZonaReservas",
    component: AdministradorGestionZonaReservasScreen,
    options: { headerShown: false },
  },
  {
    name: "Reclamos",
    component: ReclamosScreen,
    options: { title: "Centro de Atención" },
  },
  {
    name: "ReclamoNuevo",
    component: ReclamoNuevoScreen,
    options: { title: "Crear PQRS" },
  },
  {
    name: "ReclamoDetalle",
    component: ReclamoDetalleScreen,
    options: { title: "PQRS" },
  },
  { name: "Llamada", component: CallScreen, options: { title: "Llamar" } },
  {
    name: "LlamadaEnCurso",
    component: CallInProgressScreen,
    options: { title: "Llamar", headerShown: false },
  },
  { name: "Chat", component: ChatScreen, options: { title: "Chat" } },
  {
    name: "ChatConversacion",
    component: ChatConversacionScreen,
    options: { title: "Chat" },
  },
  {
    name: "ChatNuevo",
    component: ChatNuevoScreen,
    options: { title: "Nuevo chat" },
  },
  {
    name: "Aceptar",
    component: PropietarioAceptacionScreen,
    options: { title: "Aceptar propiedad" },
  },
  {
    name: "InvitarAUnidad",
    component: PropietarioInvitarScreen,
    options: { title: "Invitar a la vivienda" },
  },
  {
    name: "CrearRol",
    component: PropietarioCrearRolScreen,
    options: { title: "Gestión de usuarios" },
  },
  {
    name: "HistorialContrato",
    component: PropietarioHistorialContratoScreen,
    options: { title: "Historial de Contrato" },
  },
  {
    name: "HuespedesTemporales",
    component: PropietarioHuespedesTemporalesScreen,
    options: { title: "Conf. Huéspedes Temporales" },
  },
  {
    name: "CuadroHonor",
    component: CuadroHonorScreen,
    options: { title: "Cuadro de Honor" },
  },
  {
    name: "Reputacion",
    component: ReputacionScreen,
    options: { title: "Reputación" },
  },
  {
    name: "InquilinoLiderUbicacion",
    component: AdministracionUbicacionScreen,
    options: { title: "Mis viviendas" },
  },
  {
    name: "MiAlojamiento",
    component: MiAlojamientoScreen,
    options: { title: "Mi alojamiento" },
  },
  {
    name: "DirectorioPropiedades",
    component: DirectorioPropiedadesScreen,
    options: { title: "Directorio de Propiedades" },
  },
];

export function renderSharedScreens(Stack: StackNavigator) {
  return SHARED_SCREENS.map(({ name, component, options }) => (
    <Stack.Screen
      key={name}
      name={name}
      component={component}
      options={options}
    />
  ));
}
