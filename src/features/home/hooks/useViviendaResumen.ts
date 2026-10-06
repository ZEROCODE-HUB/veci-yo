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
import { esNoResidente } from "../helpers/noResidente";

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
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  /*
    Si las viviendas de verdad ya llegaron. Hasta entonces la pantalla no puede
    decir «no tienes ninguna»: todavia no se sabe, y confundir las dos cosas es
    lo que hacia que al abrir la aplicacion se vieran dos casas inventadas.
  */
  const ubicacionesCargadas = useUbicacionStore((state) => state.cargadas);
  const ubicacionActiva =
    ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  /*
    Salía de `propietario-store.residentesDeclarados`, un mapa
    `correo -> boolean` en memoria: se perdía al recargar y usaba el correo
    como clave de identidad, que la regla 3 prohíbe. `es_residente` ya venía
    cargado en la sesión desde `membresia_unidad` y no lo miraba nadie.
  */
  const unidadActiva = useUnidadActiva();

  const esAdministrador = rolActivo === "administrador";
  const esGuardia = rolActivo === "guardia";
  const esHuespedTemporal = rolActivo === "huesped-temporal";
  /*
    Un propietario, con o sin la coletilla del rol.

    Se pedia `rolActivo === "propietario"` a secas, y a quien **de verdad** no
    reside la sesion le da `propietario-no-residente`: la comprobacion fallaba
    justo con la persona para la que estaba escrita, asi que `noResidente` no
    podia ser cierto nunca y la restriccion --ocultarle correspondencia, visitas
    y zonas comunes, que son de quien vive alli-- no se aplicaba a nadie.

    Salio recorriendo la aplicacion con Guillermo puesto como no residente: el
    menu le salia entero. Es la decima cosa decorativa del proyecto, y de las
    mas escondidas, porque el codigo que la implementa **existe y es correcto**;
    lo que no llega es la condicion.

    `noResidente` mira las dos cosas: el rol --quien solo tiene viviendas donde
    no vive-- y la vivienda activa --quien tiene dos y esta mirando aquella
    donde no vive--.
  */
  const esPropietario =
    rolActivo === "propietario" || rolActivo === "propietario-no-residente";
  const esInquilinoLider = rolActivo === "inquilino-lider";
  const esResidente = esPropietario
    ? (unidadActiva?.esResidente ?? true)
    : true;
  const noResidente = esNoResidente(rolActivo, esResidente);
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

  /*
    `helpKey` ya no se usa: era para el modo incognito, que en vez de navegar
    abria el globo de ayuda --no habia a donde ir, porque la vivienda era
    inventada--. Retirado el modo, pulsar un modulo siempre navega.

    El parametro se queda porque lo pasan ocho llamadas y quitarlo es tocar
    ocho sitios para nada; lleva `_` para que el linter no lo cuente como un
    cabo suelto, que es lo que de verdad significa una variable sin usar en
    este proyecto.
  */
  const abrirModulo = (screen: string, _helpKey?: string) => {
    if (esAdministrador && screen === "ZonasComunes")
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
    cargando: !ubicacionesCargadas,
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
