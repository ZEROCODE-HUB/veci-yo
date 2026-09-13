import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { usePropietarioStore } from "@/stores/propietario-store";
import {
  CONFIG_ADMIN_OPCIONES,
  GUESTBOOK_MODULE,
  MODULOS_CONFIG,
} from "../homeMockData";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";

export function useViviendaResumen() {
  const navigation = useNavigation<any>();
  const [configOpen, setConfigOpen] = useState(false);
  const [popupKey, setPopupKey] = useState<string | null>(null);
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const modo = useAuthStore((state) => state.modo);
  const usuario = useAuthStore((state) => state.usuario);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const residentesDeclarados = usePropietarioStore(
    (state) => state.residentesDeclarados,
  );

  const esIncognito = modo === "incognito";
  const esAdministrador = rolActivo === "administrador";
  const esGuardia = rolActivo === "guardia";
  const esHuespedTemporal = rolActivo === "huesped-temporal";
  const esPropietario = rolActivo === "propietario";
  const esResidente = esPropietario
    ? (residentesDeclarados[usuario?.correo || ""] ?? true)
    : true;
  const noResidente = esPropietario && !esResidente;
  const sinPropiedades = esPropietario && ubicaciones.length === 0;

  const visibleModules = esHuespedTemporal
    ? [
        ...MODULOS_CONFIG.filter((modulo) => modulo.id !== "ranking"),
        GUESTBOOK_MODULE,
      ]
    : noResidente
      ? MODULOS_CONFIG.filter(
          (modulo) =>
            !["correspondencia", "visitas", "zonas-comunes"].includes(
              modulo.id,
            ),
        )
      : MODULOS_CONFIG;

  const handleConfiguracion = () => {
    if (esAdministrador) setConfigOpen((actual) => !actual);
    else if (esPropietario)
      navigateToRoute(navigation, "PropietarioConfiguracion");
    else navigateToRoute(navigation, "Configuracion");
  };

  const abrirModulo = (screen: string, helpKey: string) => {
    if (esIncognito) setPopupKey(helpKey);
    else if (esAdministrador && screen === "ZonasComunes")
      navigateToRoute(navigation, "GestionZonas");
    else navigateToRoute(navigation, screen);
  };

  const alternarPopup = (helpKey: string, abierto: boolean) => {
    setPopupKey(abierto ? helpKey : null);
  };

  return {
    configOpen,
    popupKey,
    rolActivo,
    esIncognito,
    esAdministrador,
    esGuardia,
    sinPropiedades,
    ubicacionActiva,
    visibleModules,
    opcionesConfiguracion: CONFIG_ADMIN_OPCIONES,
    handleConfiguracion,
    abrirModulo,
    alternarPopup,
    cerrarConfiguracion: () => setConfigOpen(false),
    navegarConfiguracion: (screen: string) =>
      navigateToRoute(navigation, screen),
  };
}
