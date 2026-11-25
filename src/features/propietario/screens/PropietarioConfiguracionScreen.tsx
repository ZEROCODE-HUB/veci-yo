import React, { useState } from "react";
import { View, ScrollView, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "@/stores";
import { Button, SegunLaCarga } from "@/shared/components";
import { usePropietarioConfiguracion } from "../hooks/usePropietarioConfiguracion";
import { residentesActuales } from "../services/residentesActuales";
import type { ResidenteDeUnidad } from "../services/residentes.repo";
import { usePermisosEnLaVivienda, useUnidadActiva } from "@/shared/hooks";
import type {
  PropietarioStackParamList,
  SharedStackParamList,
} from "@/shared/types";
import { ContactosPrincipales } from "../components/configuracion/ContactosPrincipales";
import { ListaDeTrabajadores } from "../components/invitar/ListaDeTrabajadores";
import { useTrabajadoresDeLaVivienda } from "../hooks/useTrabajadoresDeLaVivienda";
import { TarjetaDelPropietario } from "../components/configuracion/TarjetaDelPropietario";
import { ResidentesDeLaVivienda } from "../components/configuracion/ResidentesDeLaVivienda";
import { MisVehiculos } from "../components/configuracion/MisVehiculos";
import { AccionesDeLaVivienda } from "../components/configuracion/AccionesDeLaVivienda";
import { MenuDeResidente } from "../components/configuracion/MenuDeResidente";
import { DarDeBajaResidente } from "../components/configuracion/DarDeBajaResidente";
import { DeclaracionDeResidencia } from "../components/configuracion/DeclaracionDeResidencia";
import { useRentaCortaPermitida } from "../hooks/useRentaCortaPermitida";
import { DarAccesoALaApp } from "../components/invitar/DarAccesoALaApp";
import { loQueVeEnLaVivienda } from "../helpers/loQueVeEnLaVivienda";
import { porQueNoPuedeSerResidente } from "../helpers/porQueNoPuedeSerResidente";
import { PrivilegiosDePersona } from "../components/configuracion/PrivilegiosDePersona";
import { usePrivilegiosDePersonas } from "../hooks/usePrivilegiosDePersonas";

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
  const unidadActiva = useUnidadActiva();
  const rentaCortaPermitida = useRentaCortaPermitida(unidadActiva?.unidadId);
  const permisos = usePermisosEnLaVivienda();
  /*
    Qué se le ofrece según su rol en la vivienda: lo decide
    `loQueVeEnLaVivienda` (17/11/2026: el residente ve solo lo de vivir ahí).
  */
  /** Darle la app a quien vive aquí sin ella (17/11/2026). */
  const [darAccesoA, setDarAccesoA] = useState<{ id: string; nombre: string } | null>(null);
  /** Privilegios por persona y renta corta del inquilino líder (18/11/2026). */
  const privilegios = usePrivilegiosDePersonas();
  /** Los profesionales permanentes de la vivienda, con la gente (25/11/2026). */
  const trabajadores = useTrabajadoresDeLaVivienda();
  const usuarioIdActual = useAuthStore((s) => s.usuarioId ?? "");
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
    viviendaEnAlquiler,
    hayInquilinoLider,
  } = usePropietarioConfiguracion();
  const {
    esSoloResidente,
    puedeGestionarLaVivienda,
    puedeConfigurarElAlojamiento,
    puedeInvitar,
  } = loQueVeEnLaVivienda(unidadActiva?.rol, permisos.puede("invitar_a_la_vivienda"), {
    delInquilino: Boolean(yo?.puedeRentaCorta),
    enMarcha: rentaCortaEnMarcha,
  });

  /*
    «Actuales» mira la fecha. De los cuatro huespedes que la 102 tiene dados de
    alta, uno termino su estancia en agosto y otra llega en octubre: contarlos
    hacia que el titulo dijera cuatro por gente que hoy no vive ahi.
  */
  const deHoy = residentesActuales(residentes);


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

  // El «+» de arriba se quitó (25/11/2026): «Invitar» va junto a la gente de la vivienda.

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


  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">

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
                hayInquilinoLider={hayInquilinoLider}
                onCambiarResidencia={() => {
                  setPendienteResidenteValue(!esResidente);
                  setShowResidentePopup(true);
                }}
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
            onCambiarPermisoDeVisitas={(r) =>
              cambiarPermisoDeVisitas(r.id, !r.puedeRegistrarVisitas)
            }
            onMenu={setMenuResidente}
          />
        </SegunLaCarga>

        {puedeInvitar ? (
          <Button variant="primary" onPress={() => navigation.navigate("InvitarAUnidad")}>
            <Text>+ Invitar a alguien a la vivienda</Text>
          </Button>
        ) : null}

        {/*
          Los dos contactos de la vivienda, en un sitio (25/11/2026): antes eran
          casillas de «primario» repetidas en cada tarjeta.
        */}
        {esSoloResidente ? null : (
          <ContactosPrincipales
            personas={[
              ...(yo ? [{ id: yo.id, nombre: `${usuario?.nombre ?? ""} ${usuario?.apellido ?? ""}`.trim() + " (tú)" }] : []),
              ...deHoy
                .filter((r) => r.rol !== "Huesped Temporal" && !r.esMenor && r.id !== yo?.id)
                .map((r) => ({ id: r.id, nombre: r.nombre })),
            ]}
            principalId={
              propietarioAdministradorPrimario && yo
                ? yo.id
                : (deHoy.find((r) => r.esAdministradorPrimario)?.id ?? null)
            }
            huespedesId={
              propietarioAnfitrionPrimario && yo ? yo.id : (deHoy.find((r) => r.esAnfitrionPrimario)?.id ?? null)
            }
            conHuespedes={Boolean(rentaCortaPermitida)}
            onPrincipal={setAdministradorPrimario}
            onHuespedes={setAnfitrionPrimario}
          />
        )}

        {/* Los profesionales permanentes, aquí con la gente (25/11/2026). */}
        {puedeInvitar ? (
          <View className="gap-2">
            <ListaDeTrabajadores
              trabajadores={trabajadores.trabajadores}
              situacion={trabajadores.situacion}
              onDarDeBaja={trabajadores.darDeBaja}
              dandoDeBajaId={trabajadores.dandoDeBajaId}
              onCambiarPermisos={trabajadores.cambiarPermisos}
              guardandoPermisos={trabajadores.guardandoPermisos}
              onReenviar={trabajadores.reenviarInvitacion}
              reenviandoId={trabajadores.reenviandoId}
            />
            <Button
              variant="secondary"
              onPress={() => navigation.navigate("VisitasNuevo", { tipoPreseleccionado: "permanente" })}
            >
              <Text>+ Agregar profesional permanente</Text>
            </Button>
          </View>
        ) : null}

        <MisVehiculos unidadId={unidadActiva?.unidadId ?? ""} />

        <AccionesDeLaVivienda
          // Sin renta corta en el edificio, no se ofrece configurarla (13/11/2026).
          puedeConfigurarElAlojamiento={puedeConfigurarElAlojamiento && rentaCortaPermitida}
          puedeGestionarLaVivienda={puedeGestionarLaVivienda}
          onFuncionalidades={() => navigation.navigate("HuespedesTemporales")}
          onContratos={() => navigation.navigate("HistorialContrato")}
          onServicios={() => navigation.navigate("AgregarServicio")}
        />
      </ScrollView>

      <PrivilegiosDePersona
        persona={privilegios.privilegiosDe}
        guardando={privilegios.guardandoPrivilegios}
        onClose={privilegios.cerrarPrivilegios}
        onGuardar={privilegios.guardarPrivilegios}
      />
      <MenuDeResidente
        residente={menuResidente}
        puedeGestionar={puedeGestionarLaVivienda}
        puedeDarAcceso={puedeInvitar}
        onDarAcceso={(r) => setDarAccesoA({ id: r.id, nombre: r.nombre })}
        onClose={() => setMenuResidente(null)}
        onEditar={(r) => navigation.navigate("CrearRol", { editar: r })}
        onPrivilegios={privilegios.abrirPrivilegios}
        usuarioId={usuarioIdActual}
        puedeDarRentaCorta={unidadActiva?.rol === "propietario" && Boolean(rentaCortaPermitida)}
        onRentaCorta={privilegios.cambiarRentaCorta}
        onDarDeBaja={setDeleteResidente}
        onDenunciar={(r) =>
          navigation.navigate("ReclamoNuevo", {
            categoriaPreseleccionada: "Denuncia entre departamentos",
            tituloPreseleccionado: `Denuncia: ${r.nombre || ""}`,
            descripcionPreseleccionada: `Reporte desde Configuración contra: ${r.nombre || ""} (CI: ${r.ci || ""})`,
          })
        }
      />

      <DarAccesoALaApp persona={darAccesoA} onClose={() => setDarAccesoA(null)} />

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
        motivoQueLoImpide={porQueNoPuedeSerResidente({
          esResidente,
          viviendaEnAlquiler,
          anfitrionPrimario: propietarioAnfitrionPrimario,
          rentaCortaEnMarcha,
          hayInquilinoLider,
        })}
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
