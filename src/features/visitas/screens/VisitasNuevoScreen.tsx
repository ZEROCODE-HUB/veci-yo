import { theme } from "@/config";
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Input,
  Select,
  Calendar,
  Contador,
  Modal,
} from "@/shared/components";
import {
  VisitaSuccessView,
  VisitaTipoCard,
} from "@/features/visitas/components";
import { ResumenDeEstancia } from "../components/nuevo/ResumenDeEstancia";
import { numeroEntreIguales } from "../helpers/numeroEntreIguales";
import { useVisitasNuevo } from "@/features/visitas/hooks";
import { DatosPersona } from "../components/nuevo/DatosPersona";
import { HorariosVisita } from "../components/nuevo/HorariosVisita";
import { VehiculosVisita } from "../components/nuevo/VehiculosVisita";
import { RegistroGuardia } from "../components/nuevo/RegistroGuardia";
import { formatDate } from "@/shared/utils";

/**
 * Alta de visitas. Solo composicion: el estado y las reglas viven en
 * `useVisitasNuevo`.
 */
export function VisitasNuevoScreen() {
  const {
    esGuardia,
    esAdmin,
    esGuardiaOAdmin,
    esProfesional,
    tiposDisponibles,
    torresReales,
    codigosDe,
    estacionamientos,
    estacionamientosAsignados,
    navigation,
    tipoSeleccionado,
    setTipoSeleccionado,
    torre,
    setTorre,
    depto,
    setDepto,
    setPersonas,
    cantidadMenores,
    setCantidadMenores,
    selectedDate,
    fechaSalida,
    setSelectedDate,
    nombre,
    setNombre,
    tipoId,
    setTipoId,
    identificacion,
    setIdentificacion,
    email,
    setEmail,
    telefono,
    setTelefono,
    horaInicio,
    setHoraInicio,
    profesion,
    setProfesion,
    profesionOtro,
    setProfesionOtro,
    tieneVehiculo,
    setTieneVehiculo,
    cantidadVehiculos,
    setCantidadVehiculos,
    vehiculos,
    setVehiculos,
    acompanantes,
    setAcompanantes,
    aviso,
    setAviso,
    aprobadoPor,
    setAprobadoPor,
    anotacionesGuardia,
    setAnotacionesGuardia,
    showSuccess,
    esParaAdministracion,
    setEsParaAdministracion,
    showAvisoMenores,
    setShowAvisoMenores,
    fotosIngreso,
    setFotosIngreso,
    estacionamientosSel,
    setEstacionamientosSel,
    handleGuardar,
    tipoPreseleccionado,
    salidaComoFecha,
    alElegirRango,
    diasOcupados,
    cuantasPersonas,
    tieneSuscripcion,
  } = useVisitasNuevo();

  /** Se usa en tres sitios de esta pantalla; se nombra una vez. */
  const esHuespedTemporalSeleccionado = tipoSeleccionado === "huesped-temporal";

  if (showSuccess) {
    return (
      <VisitaSuccessView
        tipoSeleccionado={tipoSeleccionado}
        nombre={nombre}
        fecha={selectedDate}
        fechaSalida={fechaSalida}
        esHT={tipoSeleccionado === "huesped-temporal"}
        // Quien registra desde la portería es porque la persona ya entró.
        estado={esGuardia ? "Ingresado" : "Pendiente"}
        onVolver={() => navigation.goBack()}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-5 gap-4"
    >
      {/*
        Solo si de verdad falta. Estaba escrito a fuego, asi que un anfitrion
        con la renta corta pagada leia que tiene que activarla.
      */}
      {esHuespedTemporalSeleccionado && !tieneSuscripcion && (
        <View
          className="flex-row items-center gap-2.5 p-3 rounded-xl"
          style={{
            backgroundColor: theme.colors.borderLight,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: 20 }}>🔒</Text>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-500">
              Huésped Temporal — Requiere suscripción
            </Text>
            <Text className="text-xs text-gray-400">
              Puedes activarlo desde Configuración {">"} Huéspedes Temporales.
            </Text>
          </View>
        </View>
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
          {/* Guest count section */}
          <View
            className="rounded-2xl p-4 gap-3"
            style={{
              boxShadow: theme.shadows.card,
            }}
          >
            <Text className="text-base font-semibold text-center text-gray-900">
              Cantidad de invitados
            </Text>

            {esGuardiaOAdmin ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Select
                    label="Torre"
                    value={torre || null}
                    options={["Todas", ...torresReales]}
                    onChange={(v) => setTorre(v === "Todas" ? "" : String(v))}
                  />
                </View>
                <View className="flex-1">
                  <Select
                    label="Depto"
                    value={depto || null}
                    options={["Todos", ...codigosDe(torre)]}
                    onChange={(v) => setDepto(v === "Todos" ? "" : String(v))}
                  />
                </View>
              </View>
            ) : (
              /*
                Un residente registra para **su** vivienda y no puede cambiarla.
                Hasta el 09/10/2026 se enseñaba en dos cajas con borde y fondo
                gris, iguales a los campos de al lado: parecen editables, se
                pulsan y no pasa nada. Un dato que no se toca se escribe, no se
                mete en un recuadro con forma de campo.
              */
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="home"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text className="text-sm text-gray-500">Vivienda</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {torre && depto ? `${torre} · ${depto}` : "—"}
                </Text>
              </View>
            )}

            {tipoSeleccionado !== "permanente" && (
              <View className="gap-3 pt-1">
                <Contador
                  emoji="👥"
                  label="Personas"
                  ayuda="Incluye al titular de la reserva."
                  valor={cuantasPersonas}
                  minimo={1}
                  onCambiar={(v) => setPersonas(String(v))}
                />
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.colors.borderLight,
                  }}
                />
                <Contador
                  emoji="👶"
                  label="Menores"
                  ayuda="De las personas de arriba, cuántas son menores de edad."
                  valor={cantidadMenores}
                  /*
                    El titular no puede ser menor, asi que el tope es uno menos
                    que el total. Antes el tope se aplicaba al salir del campo
                    de texto: se podian teclear nueve menores de tres personas
                    y verlo escrito un rato.
                  */
                  maximo={Math.max(0, cuantasPersonas - 1)}
                  onCambiar={setCantidadMenores}
                />
              </View>
            )}
          </View>

          {tipoSeleccionado === "permanente" && (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: theme.colors.bgMuted }}
            >
              <Text className="text-xs text-gray-500 leading-5">
                El profesional permanente se registra de a uno. Podés registrar
                visitas adicionales creando una nueva visita.
              </Text>
            </View>
          )}

          {/* Admin checkbox */}
          {esAdmin && (
            <View
              className="rounded-xl p-3"
              style={{
                backgroundColor: theme.colors.bgMuted,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel="Visita para administración"
                  accessibilityState={{ checked: esParaAdministracion }}
                  aria-checked={esParaAdministracion}
                  onPress={() => setEsParaAdministracion(!esParaAdministracion)}
                  className="w-5 h-5 rounded border items-center justify-center"
                  style={{
                    borderWidth: 2,
                    borderColor: esParaAdministracion
                      ? theme.colors.secondary
                      : theme.colors.borderStrong,
                    backgroundColor: esParaAdministracion
                      ? theme.colors.secondary
                      : "transparent",
                  }}
                >
                  {esParaAdministracion && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setEsParaAdministracion(!esParaAdministracion)}
                  className="flex-1"
                >
                  <Text className="text-sm text-gray-900 font-medium">
                    Visita para administración
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Calendar */}
          {esGuardia ? (
            <View
              className="rounded-2xl p-4 items-center gap-2"
              style={{
                backgroundColor: theme.colors.bgMuted,
                boxShadow: theme.shadows.card,
              }}
            >
              <Text className="text-sm text-gray-500">Fecha de la visita</Text>
              <Text className="text-lg font-bold text-gray-900">
                Hoy — {formatDate(new Date())}
              </Text>
              <Text className="text-xs text-gray-400">
                El Guardia solo puede registrar visitas del mismo día
              </Text>
            </View>
          ) : esHuespedTemporalSeleccionado ? (
            /*
              Una estancia tiene dos extremos, y hasta el 09/10/2026 se pedian
              en dos sitios: este calendario para la llegada y una ventana con
              **otro** calendario mas abajo para la salida. Nada en la pantalla
              decia que el de arriba era la llegada --habia que deducirlo del
              texto de ayuda de la ventana-- y las dos fechas no se veian nunca
              juntas, asi que lo unico que importa de verdad, cuantas noches
              son, no se podia leer de un vistazo.

              Ahora es un rango: se pulsa la llegada, se pulsa la salida, y la
              banda entre las dos lo dice. Punto 67 de `REVISAR-A-OJO.md`.
            */
            <View className="gap-2">
              <Calendar
                rango
                minima={new Date()}
                selected={selectedDate}
                hasta={salidaComoFecha}
                onRango={alElegirRango}
                /*
                  Los dias que esta vivienda ya tiene reservados salen
                  tachados. La base rechaza una estancia solapada, y dejar
                  elegir para decir que no al guardar es hacer teclear para
                  nada.
                */
                ocupados={diasOcupados}
              />
              <ResumenDeEstancia
                entrada={selectedDate}
                salida={salidaComoFecha}
              />
            </View>
          ) : (
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />
          )}

          <DatosPersona
            esProfesional={esProfesional}
            esGuardia={esGuardia}
            tipoSeleccionado={tipoSeleccionado}
            nombre={nombre}
            setNombre={setNombre}
            tipoId={tipoId}
            setTipoId={setTipoId}
            identificacion={identificacion}
            setIdentificacion={setIdentificacion}
            email={email}
            setEmail={setEmail}
            telefono={telefono}
            setTelefono={setTelefono}
            profesion={profesion}
            setProfesion={setProfesion}
            profesionOtro={profesionOtro}
            setProfesionOtro={setProfesionOtro}
          />
          {/* Acompañantes */}
          {acompanantes.length > 0 && (
            <View className="gap-3">
              {acompanantes.map((acc, idx) => (
                <View
                  key={idx}
                  className="rounded-2xl p-4 gap-3"
                  style={{
                    backgroundColor: theme.colors.bgMuted,
                    boxShadow: theme.shadows.card,
                  }}
                >
                  {/*
                    El titulo dice **que** es cada ficha, porque eso ya lo
                    decidio el contador de arriba. Antes todas se llamaban
                    «Acompañante N» y cada una preguntaba otra vez, con un
                    interruptor, algo que acababa de responderse.
                  */}
                  <Text className="text-sm font-semibold text-gray-900">
                    {acc.esMenor
                      ? `👶 Menor ${numeroEntreIguales(acompanantes, idx)}`
                      : `Adulto ${numeroEntreIguales(acompanantes, idx) + 1}`}
                  </Text>
                  <Input
                    value={acc.nombre}
                    onChangeText={(v) => {
                      const updated = [...acompanantes];
                      updated[idx] = { ...updated[idx], nombre: v };
                      setAcompanantes(updated);
                    }}
                    placeholder="Nombre y Apellido"
                  />
                  <View>
                    <Text className="text-xs text-gray-500 mb-1">
                      Identificación{" "}
                      {tipoSeleccionado === "temporal" ? "*" : "(opcional)"}
                    </Text>
                    <Input
                      value={acc.ci}
                      onChangeText={(v) => {
                        const updated = [...acompanantes];
                        updated[idx] = { ...updated[idx], ci: v };
                        setAcompanantes(updated);
                      }}
                      placeholder={
                        tipoSeleccionado === "temporal"
                          ? "Obligatorio"
                          : "Opcional"
                      }
                      type="numeric"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Menor warning */}
          {acompanantes.some((a) => a.esMenor) && (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: theme.colors.warningLight }}
            >
              <Text
                className="text-xs leading-5"
                style={{ color: theme.colors.iconAmberDark }}
              >
                Advertencia legal: Si el invitado es menor de edad, debe
                ingresar con su padre/madre/tutor legal con la documentación
                respectiva. Este edificio está comprometido con la prevención
                del abuso sexual de menores y la trata de personas.
              </Text>
            </View>
          )}

          <HorariosVisita
            esGuardia={esGuardia}
            horaInicio={horaInicio}
            setHoraInicio={setHoraInicio}
          />
          <VehiculosVisita
            tieneVehiculo={tieneVehiculo}
            setTieneVehiculo={setTieneVehiculo}
            cantidadVehiculos={cantidadVehiculos}
            setCantidadVehiculos={setCantidadVehiculos}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
          />
          {/*
            Como se avisa al residente de que alguien viene.

            **No aparece para el huesped temporal**, por decision del cliente del
            02/10/2026: es una pregunta sobre visitantes --si al vecino se le
            avisa o ademas se le anuncia en la puerta-- y una estancia de varios
            dias no se anuncia, se reserva. El valor se queda en el que trae por
            defecto la columna.
          */}
          {esHuespedTemporalSeleccionado ? null : esGuardia ? (
            <View
              className="rounded-xl p-3"
              style={{
                backgroundColor: theme.colors.borderLight,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text className="text-sm text-gray-600 text-center">
                Ingreso mediante <Text className="font-bold">anuncio</Text> — se
                notificará y anunciará al residente. La opción "solo notificado"
                aplica únicamente cuando el residente pre-registró la visita.
              </Text>
            </View>
          ) : (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: theme.colors.bgMuted,
                boxShadow: theme.shadows.card,
              }}
            >
              <Text className="text-base font-semibold text-center text-gray-900">
                Tipo de notificación
              </Text>
              <View className="flex-row gap-2">
                {[
                  { id: "solo_notificar" as const, label: "Solo notificar" },
                  {
                    id: "notificar_y_anunciar" as const,
                    label: "Notificar y anunciar",
                  },
                ].map((op) => (
                  <Pressable
                    key={op.id}
                    onPress={() => setAviso(op.id)}
                    /*
                      Son dos opciones excluyentes y lo único que decía cuál
                      estaba elegida era el color del fondo. `aria-checked`
                      aparte porque react-native-web no traduce
                      `accessibilityState`.
                    */
                    accessibilityRole="radio"
                    accessibilityState={{ checked: aviso === op.id }}
                    aria-checked={aviso === op.id}
                    className="flex-1 items-center py-3 rounded-xl"
                    style={{
                      backgroundColor:
                        aviso === op.id
                          ? theme.colors.primary
                          : theme.colors.borderLight,
                      borderWidth: 1.5,
                      borderColor:
                        aviso === op.id
                          ? theme.colors.primary
                          : theme.colors.border,
                    }}
                  >
                    <Text
                      className="text-sm text-center"
                      style={{
                        color:
                          aviso === op.id
                            ? theme.colors.textInverse
                            : theme.colors.text,
                        fontWeight: aviso === op.id ? "600" : "400",
                      }}
                    >
                      {op.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <RegistroGuardia
            esGuardia={esGuardia}
            tieneVehiculo={tieneVehiculo}
            estacionamientos={estacionamientos}
            estacionamientosAsignados={estacionamientosAsignados}
            estacionamientosSel={estacionamientosSel}
            setEstacionamientosSel={setEstacionamientosSel}
            aprobadoPor={aprobadoPor}
            setAprobadoPor={setAprobadoPor}
            anotacionesGuardia={anotacionesGuardia}
            setAnotacionesGuardia={setAnotacionesGuardia}
            fotosIngreso={fotosIngreso}
            setFotosIngreso={setFotosIngreso}
          />
          {/* Submit */}
          <Button onPress={handleGuardar}>Aceptar</Button>

          <View className="h-4" />
        </>
      )}

      {/* Aviso legal al marcar un acompañante como menor de edad */}
      <Modal
        visible={showAvisoMenores}
        onClose={() => setShowAvisoMenores(false)}
        title="Aviso legal — menores de edad"
      >
        <View className="items-center gap-4">
          <Text style={{ fontSize: 40 }}>👶⚠️</Text>
          <Text
            className="text-base text-gray-900 text-center"
            style={{ lineHeight: 24 }}
          >
            Si el invitado es menor de edad, debe ingresar con su
            padre/madre/tutor legal con la documentación respectiva. Este
            edificio está comprometido con la prevención del abuso sexual de
            menores y la trata de personas.
          </Text>
          <Button fullWidth onPress={() => setShowAvisoMenores(false)}>
            Entendido
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}
