import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { useUnidadActiva, useNavegacion } from "@/shared/hooks";
import {
  CONFIG_ADMIN_OPCIONES,
  GUESTBOOK_MODULE,
  MODULOS_CONFIG,
} from "../constants";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";

// El huesped ve lo de su estancia, no lo de la comunidad: la correspondencia y
// el cuadro de honor son del residente, y RLS ya se los niega, asi que
// dejarlos en el menu solo llevaria a pantallas vacias.
//
// Los anuncios si los ve, pero solo los que la administracion marque
// `para_huespedes` —el corte de agua de mañana le afecta igual que a todos— y
// nunca las encuestas: esta de paso, no vota. Lo decide la base desde
// 20260922203000; hasta entonces esa casilla no servia para nada y este modulo
// tambien estaba vedado.
const MODULOS_VEDADOS_AL_HUESPED = ["correspondencia", "ranking"];

export function useViviendaResumen() {
  const navigation = useNavegacion();
  const [configOpen, setConfigOpen] = useState(false);
  const [popupKey, setPopupKey] = useState<string | null>(null);
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const modo = useAuthStore((state) => state.modo);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  /*
    Salía de `propietario-store.residentesDeclarados`, un mapa
    `correo -> boolean` en memoria: se perdía al recargar y usaba el correo
    como clave de identidad, que la regla 3 prohíbe. `es_residente` ya venía
    cargado en la sesión desde `membresia_unidad` y no lo miraba nadie.
  */
  const unidadActiva = useUnidadActiva();

  const esIncognito = modo === "incognito";
  const esAdministrador = rolActivo === "administrador";
  const esGuardia = rolActivo === "guardia";
  const esHuespedTemporal = rolActivo === "huesped-temporal";
  const esPropietario = rolActivo === "propietario";
  const esInquilinoLider = rolActivo === "inquilino-lider";
  const esResidente = esPropietario
    ? (unidadActiva?.esResidente ?? true)
    : true;
  const noResidente = esPropietario && !esResidente;
  const sinPropiedades = esPropietario && ubicaciones.length === 0;

  const visibleModules = esHuespedTemporal
    ? [
        ...MODULOS_CONFIG.filter(
          (modulo) => !MODULOS_VEDADOS_AL_HUESPED.includes(modulo.id),
        ).map((modulo) =>
          // El huesped no vota, asi que prometerle encuestas en la etiqueta es
          // prometer algo que la pantalla no le va a dar.
          modulo.id === "anuncios" ? { ...modulo, label: "Anuncios" } : modulo,
        ),
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
    else if (esPropietario || esInquilinoLider)
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
