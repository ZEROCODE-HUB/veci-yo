import { theme } from "@/config";
import React, { useState, useLayoutEffect } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, useUIStore } from "@/stores";
import { SegunLaCarga } from "@/shared/components";
import { usePropietarioConfiguracion } from "../hooks/usePropietarioConfiguracion";
import { residentesActuales } from "../services/residentesActuales";
import type { ResidenteDeUnidad } from "../services/residentes.repo";
import { usePermisosEnLaVivienda, useUnidadActiva } from "@/shared/hooks";
import type {
  PropietarioStackParamList,
  SharedStackParamList,
} from "@/shared/types";
import { AyudaDelCoadministrador } from "../components/configuracion/AyudaDelCoadministrador";
import { TarjetaDelPropietario } from "../components/configuracion/TarjetaDelPropietario";
import { ResidentesDeLaVivienda } from "../components/configuracion/ResidentesDeLaVivienda";
import { MisVehiculos } from "../components/configuracion/MisVehiculos";
import { AccionesDeLaVivienda } from "../components/configuracion/AccionesDeLaVivienda";
import { MenuDeResidente } from "../components/configuracion/MenuDeResidente";
import { DarDeBajaResidente } from "../components/configuracion/DarDeBajaResidente";
import { DeclaracionDeResidencia } from "../components/configuracion/DeclaracionDeResidencia";
import { useRentaCortaPermitida } from "../hooks/useRentaCortaPermitida";

type Nav = NativeStackNavigationProp<
  PropietarioStackParamList & SharedStackParamList,
  "PropietarioConfiguracion"
>;

/**
 * La configuración de la vivienda: el propietario, la gente que vive en ella,
 * sus vehículos y los accesos a invitar, renta corta, contratos y servicios.
 *
 * Cada bloque es un componente de `components/configuracion/` (26/10/2026: la
 * pantalla tenía 909 líneas).
 */
export function PropietarioConfiguracionScreen() {
  const navigation = useNavigation<Nav>();
  const { rolActivo, usuario } = useAuthStore();
  /*
    Quien puede dar de alta gente en la vivienda.

    La base lo dice en `puede_invitar_a_unidad`: el propietario y el inquilino
    lider de la unidad, y nadie mas. Pero la aplicacion le da la vista del
    inquilino lider tambien a `residente`, `corresidente` y `coadministrador`
    --decision D-01, todavia abierta-- asi que a un residente se le ofrecia el
    formulario de invitar, lo rellenaba, y recibia «No tenés permiso para
    invitar a esta unidad». Esto no decide D-01 --que va de que *ve* un
    residente--: solo deja de ofrecerle lo que la base ya le niega.
  */
  const unidadActiva = useUnidadActiva();
  const puedeGestionarLaVivienda =
    unidadActiva?.rol === "propietario" ||
    unidadActiva?.rol === "inquilino_lider";
  /*
    La renta corta la configura además el coadministrador de la vivienda: es
    lo que dice `puede_configurar_alojamiento` en la base. Un residente no
    (hueco 21, 15/10/2026: le salían las tarjetas y fallaban al tocarlas).
  */
  const rentaCortaPermitida = useRentaCortaPermitida(unidadActiva?.unidadId);
  const puedeConfigurarElAlojamiento =
    puedeGestionarLaVivienda || unidadActiva?.rol === "coadministrador";
  /*
    Invitar a la vivienda lo decide el rol (huecos 9 y 14, 26/10/2026): el
    administrador de la app lo permite o no a cada uno desde el panel. El
    propietario siempre puede.
  */
  const permisos = usePermisosEnLaVivienda();
  const puedeInvitar =
    unidadActiva?.rol === "propietario" || permisos.puede("invitar_a_la_vivienda");
  const { addToast } = useUIStore();
  const {
    cargaDelPropietario,
    cargaDeLaLista,
    pendiente,
    declarando,
    quitando,
    residentes,
    propietarioAnfitrionPrimario,
    propietarioAdministradorPrimario,
    yo,
    esResidente,
    eliminarResidente,
    setAnfitrionPrimario,
    setAdministradorPrimario,
    togglePropietarioResidente,
    apruebaHuespedPorHuesped,
    cambiarPermisoDeVisitas,
    rentaCortaEnMarcha,
    quitarAnfitrionPrimario,
    viviendaEnAlquiler,
  } = usePropietarioConfiguracion();

  /*
    «Actuales» mira la fecha. De los cuatro huespedes que la 102 tiene dados de
    alta, uno termino su estancia en agosto y otra llega en octubre: contarlos
    hacia que el titulo dijera cuatro por gente que hoy no vive ahi.
  */
  const deHoy = residentesActuales(residentes);

  /*
    Las dos casillas de primario **no se pueden desmarcar**, y eso esta bien:
    la vivienda tiene que tener un anfitrion primario --el libro del huesped
    dice «contacta al anfitrion primario del departamento»-- y el indice unico
    de la base no admite dos. No se quita: se le pasa a otra persona.

    Lo que estaba mal era el silencio. Al pulsar una casilla ya marcada el
    manejador volvia a designar a la misma persona: ni cambiaba nada, ni
    avisaba de nada. Indistinguible de un boton roto.
  */
  const yaEsPrimario = (cual: "anfitrion" | "administrador") =>
    addToast(
      cual === "anfitrion"
        ? "La vivienda necesita un anfitrión primario. Para cambiarlo, marca a otra persona de la lista."
        : "La vivienda necesita un administrador primario. Para cambiarlo, marca a otra persona de la lista.",
      "info",
    );

  /*
    `ResidenteDeUnidad` y no `Residente`: su `id` es **el de la membresia** --una
    cadena-- porque es lo que necesitan quitar a alguien o cambiarle la
    visibilidad.
  */
  const [menuResidente, setMenuResidente] =
    useState<ResidenteDeUnidad | null>(null);
  const [deleteResidente, setDeleteResidente] =
    useState<ResidenteDeUnidad | null>(null);
  const [showResidentePopup, setShowResidentePopup] = useState(false);
  const [pendienteResidenteValue, setPendienteResidenteValue] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        puedeInvitar ? (
          <Pressable
            accessibilityLabel="Invitar a alguien a la vivienda"
            onPress={() => navigation.navigate("InvitarAUnidad")}
            accessibilityRole="button"
            className="w-9 h-9 rounded-xl mr-1 bg-primary items-center justify-center"
          >
            {/* Un ícono y no la letra «+», que quedaba baja (21/10/2026). Y el
                mismo botón que el de correspondencia: este salía cuadrado
                (Para Claude 124, 28/10/2026). */}
            <Ionicons name="add" size={24} color={theme.colors.textInverse} />
          </Pressable>
        ) : null,
    });
  }, [navigation, puedeInvitar]);

  /*
    La ventana se cierra cuando ya se dio de baja, no antes (13/11/2026): si
    falla, sigue abierta y el aviso del error lo da el hook.
  */
  const handleEliminar = () => {
    if (!deleteResidente || quitando) return;
    // El «se dio de baja» lo dice el hook, cuando ya ocurrió.
    eliminarResidente(deleteResidente.id)
      .then(() => setDeleteResidente(null))
      .catch(() => undefined);
  };

  // Lo que se está guardando de uno mismo: «anfitrion» o «administrador».
  const [cualPendiente, idPendiente] = (pendiente ?? "").split(":");
  const pendienteMio =
    yo && idPendiente === yo.id && (cualPendiente === "anfitrion" || cualPendiente === "administrador")
      ? cualPendiente
      : null;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">
        <AyudaDelCoadministrador />

        {/*
          Aquí había una tarjeta «Tienes una propiedad asignada» con su botón
          «Aceptar invitación», que leía un store en memoria que nadie llena.
          Una invitación se acepta desde su enlace (13/10/2026).
        */}
        {(rolActivo === "propietario" ||
          rolActivo === "propietario-no-residente") &&
          usuario && (
            /*
              Mientras llegan los datos, «No residente» con el interruptor
              apagado y la renta corta «en marcha» eran valores por defecto,
              no los de la persona (13/11/2026).
            */
            <SegunLaCarga
              estado={cargaDelPropietario}
              texto="tus datos en la vivienda"
              forma="ficha"
              enLinea
            >
              <TarjetaDelPropietario
                nombre={`${usuario.nombre} ${usuario.apellido || ""}`}
                anfitrionPrimario={propietarioAnfitrionPrimario}
                administradorPrimario={propietarioAdministradorPrimario}
                esResidente={esResidente}
                rentaCortaEnMarcha={rentaCortaEnMarcha}
                viviendaEnAlquiler={viviendaEnAlquiler}
                onCambiarResidencia={() => {
                  setPendienteResidenteValue(!esResidente);
                  setShowResidentePopup(true);
                }}
                onMarcarAnfitrion={() =>
                  propietarioAnfitrionPrimario
                    ? // Se quita solo si ya no se alquila ni quedan reservas (D-70).
                      rentaCortaEnMarcha || viviendaEnAlquiler
                      ? yaEsPrimario("anfitrion")
                      : yo && quitarAnfitrionPrimario(yo.id)
                    : yo && setAnfitrionPrimario(yo.id)
                }
                onMarcarAdministrador={() =>
                  propietarioAdministradorPrimario
                    ? yaEsPrimario("administrador")
                    : yo && setAdministradorPrimario(yo.id)
                }
                pendiente={pendienteMio}
                ocupado={pendiente !== null}
                cambiandoResidencia={declarando}
              />
            </SegunLaCarga>
          )}

        {/* «Residentes actuales (0)» mientras la lista no había llegado. */}
        <SegunLaCarga
          estado={cargaDeLaLista}
          texto="los residentes"
          forma="tarjetas"
          cuantos={2}
          enLinea
        >
          <ResidentesDeLaVivienda
            pendiente={pendiente}
            deHoy={deHoy}
            mostrarPermisoDeVisitas={apruebaHuespedPorHuesped && puedeGestionarLaVivienda}
            onMarcarAnfitrion={(r) =>
              r.esAnfitrionPrimario
                ? rentaCortaEnMarcha || viviendaEnAlquiler
                  ? yaEsPrimario("anfitrion")
                  : quitarAnfitrionPrimario(r.id)
                : setAnfitrionPrimario(r.id)
            }
            onMarcarAdministrador={(r) =>
              r.esAdministradorPrimario
                ? yaEsPrimario("administrador")
                : setAdministradorPrimario(r.id)
            }
            onCambiarPermisoDeVisitas={(r) =>
              cambiarPermisoDeVisitas(r.id, !r.puedeRegistrarVisitas)
            }
            onMenu={setMenuResidente}
          />
        </SegunLaCarga>

        <MisVehiculos unidadId={unidadActiva?.unidadId ?? ""} />

        <AccionesDeLaVivienda
          puedeInvitar={puedeInvitar}
          // Sin renta corta en el edificio, no se ofrece configurarla (13/11/2026).
          puedeConfigurarElAlojamiento={puedeConfigurarElAlojamiento && rentaCortaPermitida}
          puedeGestionarLaVivienda={puedeGestionarLaVivienda}
          onInvitar={() => navigation.navigate("InvitarAUnidad")}
          onFuncionalidades={() => navigation.navigate("HuespedesTemporales")}
          onContratos={() => navigation.navigate("HistorialContrato")}
          onServicios={() => navigation.navigate("AgregarServicio")}
        />
      </ScrollView>

      <MenuDeResidente
        residente={menuResidente}
        puedeGestionar={puedeGestionarLaVivienda}
        onClose={() => setMenuResidente(null)}
        onEditar={(r) => navigation.navigate("CrearRol", { editar: r })}
        onDarDeBaja={setDeleteResidente}
        onDenunciar={(r) =>
          navigation.navigate("ReclamoNuevo", {
            categoriaPreseleccionada: "Denuncia entre departamentos",
            tituloPreseleccionado: `Denuncia: ${r.nombre || ""}`,
            descripcionPreseleccionada: `Reporte desde Configuración contra: ${r.nombre || ""} (CI: ${r.ci || ""})`,
          })
        }
      />

      <DarDeBajaResidente
        residente={deleteResidente}
        onConfirmar={handleEliminar}
        eliminando={quitando}
        onCancelar={() => setDeleteResidente(null)}
      />

      <DeclaracionDeResidencia
        visible={showResidentePopup}
        residente={pendienteResidenteValue}
        onClose={() => setShowResidentePopup(false)}
        guardando={declarando}
        onConfirmar={() => {
          if (declarando) return;
          // Se cierra cuando se guardó; si falla, sigue abierta con el aviso.
          togglePropietarioResidente(pendienteResidenteValue)
            .then(() => setShowResidentePopup(false))
            .catch(() => undefined);
        }}
      />
    </View>
  );
}
