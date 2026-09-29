import { theme } from "@/config";
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Input,
  Select,
  Toggle,
  Calendar,
  Modal,
} from "@/shared/components";
import {
  VisitaSuccessView,
  VisitaTipoCard,
} from "@/features/visitas/components";
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
    personas,
    setPersonas,
    cantidadMenores,
    setCantidadMenores,
    selectedDate,
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
    horaFin,
    setHoraFin,
    horaSalidaInicio,
    setHoraSalidaInicio,
    horaSalidaFin,
    setHoraSalidaFin,
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
    showTimePicker,
    setShowTimePicker,
    showTimePickerFin,
    setShowTimePickerFin,
    showTimePickerSalidaInicio,
    setShowTimePickerSalidaInicio,
    showTimePickerSalidaFin,
    setShowTimePickerSalidaFin,
    horaIngresoDate,
    setHoraIngresoDate,
    horaFinDate,
    setHoraFinDate,
    horaSalidaInicioDate,
    setHoraSalidaInicioDate,
    horaSalidaFinDate,
    setHoraSalidaFinDate,
    handleGuardar,
    tipoPreseleccionado,
  } = useVisitasNuevo();

  if (showSuccess) {
    return (
      <VisitaSuccessView
        tipoSeleccionado={tipoSeleccionado}
        nombre={nombre}
        fecha={selectedDate}
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
      {/* Subscription banner for HT */}
      {tipoSeleccionado === "huesped-temporal" && (
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

      {tipoSeleccionado && (
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
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Torre</Text>
                  <View
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: theme.colors.borderLight,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {torre || "—"}
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Depto</Text>
                  <View
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: theme.colors.borderLight,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {depto || "—"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {tipoSeleccionado !== "permanente" && (
              <View className="flex-row items-center gap-2">
                <Input
                  value={personas}
                  onChangeText={setPersonas}
                  placeholder="2"
                  type="numeric"
                  style={{ width: 60, textAlign: "center" }}
                />
                <Text className="text-xs text-gray-500">personas</Text>
                <Text className="text-gray-300">·</Text>
                <Input
                  value={String(cantidadMenores)}
                  onChangeText={(v) =>
                    setCantidadMenores(
                      Math.max(
                        0,
                        Math.min(
                          parseInt(v) || 0,
                          Math.max(0, parseInt(personas) - 1),
                        ),
                      ),
                    )
                  }
                  placeholder="0"
                  type="numeric"
                  style={{ width: 60, textAlign: "center" }}
                />
                <Text className="text-xs text-gray-500">👶 menores</Text>
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
                  <Text className="text-sm font-semibold text-gray-900">
                    Acompañante {idx + 1}
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
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-600">Menor de edad</Text>
                    <Toggle
                      value={acc.esMenor}
                      onChange={(v) => {
                        const updated = [...acompanantes];
                        updated[idx] = { ...updated[idx], esMenor: v };
                        setAcompanantes(updated);
                        if (v) {
                          setShowAvisoMenores(true);
                        }
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Menor warning */}
          {(acompanantes.some((a) => a.esMenor) || showAvisoMenores) && (
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
            tipoSeleccionado={tipoSeleccionado}
            horaInicio={horaInicio}
            setHoraInicio={setHoraInicio}
            horaFin={horaFin}
            setHoraFin={setHoraFin}
            horaSalidaInicio={horaSalidaInicio}
            setHoraSalidaInicio={setHoraSalidaInicio}
            horaSalidaFin={horaSalidaFin}
            setHoraSalidaFin={setHoraSalidaFin}
            showTimePicker={showTimePicker}
            setShowTimePicker={setShowTimePicker}
            showTimePickerFin={showTimePickerFin}
            setShowTimePickerFin={setShowTimePickerFin}
            showTimePickerSalidaInicio={showTimePickerSalidaInicio}
            setShowTimePickerSalidaInicio={setShowTimePickerSalidaInicio}
            showTimePickerSalidaFin={showTimePickerSalidaFin}
            setShowTimePickerSalidaFin={setShowTimePickerSalidaFin}
            horaIngresoDate={horaIngresoDate}
            setHoraIngresoDate={setHoraIngresoDate}
            horaFinDate={horaFinDate}
            setHoraFinDate={setHoraFinDate}
            horaSalidaInicioDate={horaSalidaInicioDate}
            setHoraSalidaInicioDate={setHoraSalidaInicioDate}
            horaSalidaFinDate={horaSalidaFinDate}
            setHoraSalidaFinDate={setHoraSalidaFinDate}
          />
          <VehiculosVisita
            tieneVehiculo={tieneVehiculo}
            setTieneVehiculo={setTieneVehiculo}
            cantidadVehiculos={cantidadVehiculos}
            setCantidadVehiculos={setCantidadVehiculos}
            vehiculos={vehiculos}
            setVehiculos={setVehiculos}
          />
          {/* Notification type */}
          {esGuardia ? (
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
