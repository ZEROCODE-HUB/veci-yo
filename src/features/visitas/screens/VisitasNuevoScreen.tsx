import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, Toggle } from "@/shared/components";
import {
  VisitaSuccessView,
  VisitaTipoCard,
} from "@/features/visitas/components";
import { useVisitasNuevo } from "@/features/visitas/hooks";
import { DatosPersona } from "../components/nuevo/DatosPersona";
import { HorariosVisita } from "../components/nuevo/HorariosVisita";
import { DiasDeTrabajo } from "../components/nuevo/DiasDeTrabajo";
import { VehiculosVisita } from "../components/nuevo/VehiculosVisita";
import { RegistroGuardia } from "../components/nuevo/RegistroGuardia";
import { CantidadDeInvitados } from "../components/nuevo/CantidadDeInvitados";
import { VisitaParaAdministracion } from "../components/nuevo/VisitaParaAdministracion";
import { FechasDeLaVisita } from "../components/nuevo/FechasDeLaVisita";
import { AcompanantesDeLaVisita } from "../components/nuevo/AcompanantesDeLaVisita";
import { TipoDeNotificacion } from "../components/nuevo/TipoDeNotificacion";
import { AvisoLegalDeMenores } from "../components/nuevo/AvisoLegalDeMenores";
import { AvisoSinRentaCorta } from "../components/historial/AvisoSinRentaCorta";
import { useParametrosDeLaBase, useUnidadActiva } from "@/shared/hooks";
import { useDatosDelMensaje } from "../hooks/useDatosDelMensaje";

/**
 * Alta de visitas. Solo composicion: el estado y las reglas viven en
 * `useVisitasNuevo`.
 */
export function VisitasNuevoScreen() {
  // El tope de personas (`personas_vehiculos_tope`) es del edificio.
  const parametros = useParametrosDeLaBase();
  const alta = useVisitasNuevo();
  const {
    esGuardia,
    nacenDentro,
    creando,
    esAdmin,
    esProfesional,
    tiposDisponibles,
    navigation,
    tipoSeleccionado,
    setTipoSeleccionado,
    selectedDate,
    fechaSalida,
    nombre,
    showSuccess,
    visitaCreadaId,
    handleGuardar,
    tipoPreseleccionado,
    tieneSuscripcion,
  } = alta;

  /*
    El título de arriba dice qué se está registrando (29/10/2026): con un
    profesional temporal seguía diciendo solo «Visitas».
  */
  React.useLayoutEffect(() => {
    const titulos: Record<string, string> = {
      temporal: "Profesional temporal",
      permanente: "Profesional permanente",
      amigos: "Amigos y familiares",
      "huesped-temporal": "Huésped temporal",
    };
    (navigation as unknown as { setOptions?: (o: { title: string }) => void }).setOptions?.({
      title: (tipoSeleccionado && titulos[tipoSeleccionado]) || "Visitas",
    });
  }, [navigation, tipoSeleccionado]);

  /** Se usa en tres sitios de esta pantalla; se nombra una vez. */
  const esHuespedTemporalSeleccionado = tipoSeleccionado === "huesped-temporal";
  const unidadActiva = useUnidadActiva();
  const dos = (n: number) => String(n).padStart(2, "0");
  const datosDelMensaje = useDatosDelMensaje({
    unidadId: unidadActiva?.unidadId,
    nombre,
    desde: `${selectedDate.getFullYear()}-${dos(selectedDate.getMonth() + 1)}-${dos(selectedDate.getDate())}`,
    hasta: fechaSalida,
  });

  if (showSuccess) {
    return (
      <VisitaSuccessView
        tipoSeleccionado={tipoSeleccionado}
        nombre={nombre}
        fecha={selectedDate}
        fechaSalida={fechaSalida}
        esHT={tipoSeleccionado === "huesped-temporal"}
        /*
          Quien registra desde la portería tiene a la persona en la puerta,
          pero si hay que verificar su documento todavía no ha entrado (T-025).
        */
        estado={nacenDentro ? "Ingresado" : "Pendiente"}
        siguientePaso={
          esGuardia && !nacenDentro
            ? "Abre la visita, verifica su documento y registra la entrada."
            : undefined
        }
        visitaUuid={visitaCreadaId}
        datosDelMensaje={datosDelMensaje}
        onVolver={() => navigation.goBack()}
      />
    );
  }

  return (
    <DesplazableConTeclado
      className="flex-1 bg-white"
      contentContainerClassName="p-5 gap-4"
    >
      {/*
        Solo si de verdad falta. Estaba escrito a fuego, asi que un anfitrion
        con la renta corta pagada leia que tiene que activarla.
      */}
      {esHuespedTemporalSeleccionado && !tieneSuscripcion && (
        <AvisoSinRentaCorta conTarjeta={false} />
      )}

      {/* Type selector */}
      {!tipoPreseleccionado && (
        <View className="flex-row flex-wrap gap-3 justify-center">
          {tiposDisponibles.map((tipo) => (
            <View key={tipo} style={{ width: "45%" }}>
              <VisitaTipoCard
                tipo={tipo}
                isActive={tipoSeleccionado === tipo}
                onPress={() => setTipoSeleccionado(tipo)}
              />
            </View>
          ))}
        </View>
      )}

      {Boolean(tipoSeleccionado) && (
        <>
          <CantidadDeInvitados alta={alta} parametros={parametros} />

          {/* Los días de entrada salen de los parámetros: se espera a tenerlos. */}
          {tipoSeleccionado === "permanente" && parametros.listo && (
            <DiasDeTrabajo dias={alta.diasTrabajo} onCambiar={alta.setDiasTrabajo} />
          )}

          {tipoSeleccionado === "permanente" && (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: theme.colors.bgMuted }}
            >
              <Text className="text-xs text-gray-500 leading-5">
                El profesional permanente se registra de uno en uno. Para registrar
                otro, crea una visita nueva.
              </Text>
            </View>
          )}

          {esAdmin && (
            <VisitaParaAdministracion
              valor={alta.esParaAdministracion}
              onCambiar={alta.setEsParaAdministracion}
            />
          )}

          <FechasDeLaVisita alta={alta} />

          <DatosPersona
            esProfesional={esProfesional}
            esGuardia={esGuardia}
            tipoSeleccionado={tipoSeleccionado}
            nombre={nombre}
            setNombre={alta.setNombre}
            tipoId={alta.tipoId}
            tiposDocumento={alta.tiposDocumento}
            setTipoId={alta.setTipoId}
            identificacion={alta.identificacion}
            setIdentificacion={alta.setIdentificacion}
            email={alta.email}
            setEmail={alta.setEmail}
            telefono={alta.telefono}
            setTelefono={alta.setTelefono}
            profesion={alta.profesion}
            oficios={alta.oficios}
            pideOtraProfesion={alta.pideOtraProfesion}
            setProfesion={alta.setProfesion}
            profesionOtro={alta.profesionOtro}
            setProfesionOtro={alta.setProfesionOtro}
          />
          <AcompanantesDeLaVisita alta={alta} />

          <HorariosVisita
            esGuardia={esGuardia}
            horaInicio={alta.horaInicio}
            setHoraInicio={alta.setHoraInicio}
          />
          <VehiculosVisita
            tieneVehiculo={alta.tieneVehiculo}
            setTieneVehiculo={alta.setTieneVehiculo}
            cantidadVehiculos={alta.cantidadVehiculos}
            setCantidadVehiculos={alta.setCantidadVehiculos}
            vehiculos={alta.vehiculos}
            setVehiculos={alta.setVehiculos}
            paraHuesped={esHuespedTemporalSeleccionado}
            estacionamientos={alta.estacionamientosHuesped}
          />
          {esHuespedTemporalSeleccionado ? (
            <View
              className="flex-row items-center justify-between rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.bgMuted, boxShadow: theme.shadows.card }}
            >
              <Text className="shrink text-sm text-gray-900">¿Tu huésped trae mascota?</Text>
              <Toggle
                value={alta.traeMascota}
                onChange={alta.setTraeMascota}
                labelRight={alta.traeMascota ? "Sí" : "No"}
              />
            </View>
          ) : null}
          <TipoDeNotificacion alta={alta} />

          <RegistroGuardia
            esGuardia={esGuardia}
            tieneVehiculo={alta.tieneVehiculo}
            cupos={alta.cuposDeVisita}
            estacionamientosSel={alta.estacionamientosSel}
            setEstacionamientosSel={alta.setEstacionamientosSel}
            aprobadoPor={alta.aprobadoPor}
            setAprobadoPor={alta.setAprobadoPor}
            anotacionesGuardia={alta.anotacionesGuardia}
            setAnotacionesGuardia={alta.setAnotacionesGuardia}
            fotosIngreso={alta.fotosIngreso}
            setFotosIngreso={alta.setFotosIngreso}
          />
          {/* Submit */}
          {/* Bloqueado y «cargando» mientras se crea: un segundo clic creaba otra visita. */}
          <Button onPress={handleGuardar} loading={creando} disabled={creando}>
            Aceptar
          </Button>

          <View className="h-4" />
        </>
      )}

      <AvisoLegalDeMenores
        visible={alta.showAvisoMenores}
        onClose={() => alta.setShowAvisoMenores(false)}
      />
    </DesplazableConTeclado>
  );
}
