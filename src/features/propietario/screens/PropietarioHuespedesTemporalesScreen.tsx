import { theme } from "@/config";
import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  SuscripcionPagoModal,
  Button,
  Input,
  Toggle,
  Modal,
} from "@/shared/components";
import { LimitesDelEdificio } from "../components/huespedes";
import { useHuespedesTemporales } from "../hooks/useHuespedesTemporales";

const SECTION_CARD = {
  backgroundColor: theme.colors.bgCard,
  shadowColor: theme.colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

export function PropietarioHuespedesTemporalesScreen() {
  const navigation = useNavigation();
  const {
    tieneSuscripcion,
    autorizada,
    limites,
    advertenciasDeLimite,
    minDias,
    setMinDias,
    maxHuespedes,
    setMaxHuespedes,
    permiteMascotas,
    setPermiteMascotas,
    aptoNinos,
    setAptoNinos,
    descripcion,
    setDescripcion,
    numHabitaciones,
    setNumHabitaciones,
    estacionamientosProp,
    setEstacionamientosProp,
    plataformas,
    setPlataformas,
    pms,
    setPms,
    icalLink,
    setIcalLink,
    permiteVisitasHuespedes,
    setPermiteVisitasHuespedes,
    legal,
    setLegal,
    cumplimiento,
    setCumplimiento,
    ocultarNumero,
    setOcultarNumero,
    guestbook,
    setGuestbook,
    showPayment,
    setShowPayment,
    paymentLoading,
    togglePlataforma,
    precio,
    pagoSimulado,
    irAlPago,
    confirmarPago,
    guardarConfiguracion,
    guardando,
  } = useHuespedesTemporales();

  /*
    Hacia esto y nada mas:
      addToast("Configuracion guardada exitosamente", "success");
      navigation.goBack();
    Se anunciaba el exito y se tiraba todo: aforo, minimo de noches, mascotas,
    descripcion, plataformas, RNT y el libro del alojamiento con el wifi y la
    clave de la puerta. El toast lo pone ahora el propio guardado, y solo si
    escribe.
  */
  const handleGuardar = async () => {
    try {
      await guardarConfiguracion();
      navigation.goBack();
    } catch {
      // El aviso lo da el hook; aqui solo hay que no salir de la pantalla.
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {!tieneSuscripcion && (
        <View className="rounded-2xl p-5 text-center" style={SECTION_CARD}>
          <Text className="text-base text-gray-900 text-center mb-3">
            Esta propiedad no tiene una suscripción activa para Huéspedes
            Temporales.
          </Text>
          {/*
            La autorizacion del edificio SI bloquea —la base rechaza el alta—
            asi que el boton no se ofrece: pulsarlo solo daria un error.
            Distinto de los limites numericos, que advierten (KT 4.1 paso 5).
          */}
          {autorizada ? (
            <Button variant="primary" onPress={() => setShowPayment(true)}>
              Suscribirse
            </Button>
          ) : (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: theme.colors.warningSoft }}
            >
              <Text
                className="text-xs text-center"
                style={{ color: theme.colors.badgeAmberText, lineHeight: 18 }}
              >
                Este edificio no autoriza la renta corta en esta vivienda. La
                excepción la concede la administración del condominio.
              </Text>
            </View>
          )}
        </View>
      )}

      {tieneSuscripcion && (
        <>
          {/* Parámetros de estancia y aforo */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Parámetros de estancia y aforo
            </Text>
            <LimitesDelEdificio
              limites={limites}
              avisos={advertenciasDeLimite}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Mínimo de días"
                  value={String(minDias)}
                  onChangeText={(v) => setMinDias(parseInt(v) || 1)}
                  type="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Capacidad máxima"
                  value={String(maxHuespedes)}
                  onChangeText={(v) => setMaxHuespedes(parseInt(v) || 1)}
                  type="numeric"
                />
              </View>
            </View>
          </View>

          {/* Reglas de convivencia */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Reglas de convivencia y preferencias
            </Text>
            <View className="flex-col gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-900 flex-1">
                  Se admiten mascotas
                </Text>
                <Toggle value={permiteMascotas} onChange={setPermiteMascotas} />
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-900">Apta para niños</Text>
                <Toggle value={aptoNinos} onChange={setAptoNinos} />
              </View>
              <View>
                <Text className="text-sm text-gray-900 font-medium mb-1">
                  Descripción del alojamiento
                </Text>
                <Input
                  value={descripcion}
                  onChangeText={setDescripcion}
                  placeholder="N habitaciones, camas, info de aforo..."
                  multiline
                />
              </View>
              <Input
                label="Habitaciones"
                value={String(numHabitaciones)}
                onChangeText={(v) => setNumHabitaciones(parseInt(v) || 1)}
                type="numeric"
              />
            </View>
          </View>

          {/* Estacionamientos */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Configuración de estacionamientos
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="w-[100px]">
                <Input
                  label="Cantidad"
                  value={String(estacionamientosProp)}
                  onChangeText={(v) =>
                    setEstacionamientosProp(parseInt(v) || 0)
                  }
                  type="numeric"
                />
              </View>
              <Text
                className="text-sm flex-1"
                style={{ color: theme.colors.textSecondary }}
              >
                Estacionamientos disponibles para visitantes
              </Text>
            </View>
            <View
              className="rounded-xl p-3 mt-3"
              style={{ backgroundColor: theme.colors.bgMuted }}
            >
              <Text
                className="text-xs"
                style={{ color: theme.colors.textMuted, lineHeight: 18 }}
              >
                Cuando se intente registrar una visita y no existan
                estacionamientos disponibles, se mostrará automáticamente una
                alerta.
              </Text>
            </View>
          </View>

          {/* Plataformas */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Plataformas en las que está publicado tu alojamiento
            </Text>
            <View className="flex-col gap-3">
              {[
                { key: "airbnb", label: "Airbnb", icon: "🏠" },
                { key: "booking", label: "Booking", icon: "📖" },
              ].map((item) => (
                <View
                  key={item.key}
                  className="flex-row justify-between items-center py-3"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.borderLight,
                  }}
                >
                  <View className="flex-row items-center gap-2.5">
                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    <Text className="text-sm text-gray-900">{item.label}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {plataformas[item.key as keyof typeof plataformas] &&
                      item.key === "airbnb" && (
                        <Text
                          className="text-xs flex-row items-center gap-0.5"
                          style={{ color: theme.colors.success }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={theme.colors.success}
                          />{" "}
                          Integrar
                        </Text>
                      )}
                    <Toggle
                      value={
                        !!plataformas[item.key as keyof typeof plataformas]
                      }
                      onChange={() => togglePlataforma(item.key)}
                    />
                  </View>
                </View>
              ))}
              <View
                className="flex-row justify-between items-center py-3"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.borderLight,
                }}
              >
                <Text className="text-sm text-gray-900">Otras</Text>
                {plataformas.otras ? (
                  <Input
                    value={plataformas.otras}
                    onChangeText={(v) =>
                      setPlataformas((prev) => ({ ...prev, otras: v }))
                    }
                    placeholder="Nombre"
                    style={{ width: 160 }}
                  />
                ) : (
                  <Pressable
                    onPress={() =>
                      setPlataformas((prev) => ({ ...prev, otras: " " }))
                    }
                    className="rounded-full px-3 py-1"
                    style={{ borderWidth: 1, borderColor: theme.colors.border }}
                  >
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      + Agregar
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* PMS */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              ¿Quieres integrar tu alojamiento con un PMS?
            </Text>
            <View className="flex-row justify-center gap-4 mb-3">
              <Pressable
                onPress={() => setPms({ activo: true, cual: pms.cual })}
                className="rounded-full px-6 py-2"
                style={{
                  backgroundColor: pms.activo
                    ? theme.colors.primary
                    : theme.colors.bgMuted,
                  borderWidth: 1.5,
                  borderColor: pms.activo
                    ? theme.colors.primary
                    : theme.colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: pms.activo
                      ? theme.colors.textInverse
                      : theme.colors.text,
                  }}
                >
                  Sí
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPms({ activo: false, cual: "" })}
                className="rounded-full px-6 py-2"
                style={{
                  backgroundColor: !pms.activo
                    ? theme.colors.primary
                    : theme.colors.bgMuted,
                  borderWidth: 1.5,
                  borderColor: !pms.activo
                    ? theme.colors.primary
                    : theme.colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: !pms.activo
                      ? theme.colors.textInverse
                      : theme.colors.text,
                  }}
                >
                  No
                </Text>
              </Pressable>
            </View>
            <View className="flex-col gap-3">
              <View
                className="flex-row items-center gap-2.5 p-3 rounded-xl"
                style={{
                  backgroundColor: theme.colors.bgMuted,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ fontSize: 24 }}>🏠</Text>
                <Text className="text-sm font-medium text-gray-900">
                  Airbnb
                </Text>
              </View>
              <View>
                <Text
                  className="text-sm mb-1.5 font-medium"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Agrega tu enlace de iCal de Airbnb debajo
                </Text>
                <Input
                  value={icalLink}
                  onChangeText={setIcalLink}
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                />
              </View>
            </View>
          </View>

          {/* Visitas de huéspedes */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Visitas de huéspedes
            </Text>
            <Text
              className="text-sm text-center mb-3"
              style={{ color: theme.colors.textSecondary }}
            >
              ¿Permites que tus huéspedes temporales registren visitas?
            </Text>
            <View className="flex-col gap-3">
              {[
                {
                  value: "permitir-todos",
                  label: "Permitir automáticamente a todos",
                },
                {
                  value: "prohibir-todos",
                  label: "Prohibir automáticamente a todos",
                },
                {
                  value: "aprobar-por-huesped",
                  label: "Aprobar huésped por huésped",
                },
              ].map((op) => (
                <Pressable
                  key={op.value}
                  onPress={() => setPermiteVisitasHuespedes(op.value)}
                  className="flex-row items-center gap-3 p-3.5 rounded-xl"
                  style={{
                    borderWidth: 1.5,
                    borderColor:
                      permiteVisitasHuespedes === op.value
                        ? theme.colors.primary
                        : theme.colors.border,
                    backgroundColor:
                      permiteVisitasHuespedes === op.value
                        ? theme.colors.primaryLight
                        : theme.colors.bgMuted,
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{
                      borderWidth: 2,
                      borderColor:
                        permiteVisitasHuespedes === op.value
                          ? theme.colors.primary
                          : theme.colors.border,
                    }}
                  >
                    {permiteVisitasHuespedes === op.value && (
                      <View
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                    )}
                  </View>
                  <Text className="text-sm text-gray-900">{op.label}</Text>
                </Pressable>
              ))}
              <View
                className="rounded-xl p-3"
                style={{ backgroundColor: theme.colors.bgMuted }}
              >
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textMuted, lineHeight: 18 }}
                >
                  Esta configuración aplica a todos los huéspedes temporales de
                  esta propiedad.
                </Text>
              </View>
            </View>
          </View>

          {/* Cumplimiento legal */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Cumplimiento legal
            </Text>
            <View>
              <Text
                className="text-sm mb-1.5 font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                RNT (Registro Nacional de Turismo)
              </Text>
              <Input
                value={legal.rnt}
                onChangeText={(v) => setLegal((p) => ({ ...p, rnt: v }))}
                placeholder="Ej: RNT-12345"
              />
            </View>
          </View>

          {/* Confianza */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Confianza del departamento
            </Text>
            <Text
              className="text-xs text-center mb-3"
              style={{ color: theme.colors.textSecondary }}
            >
              Marca lo que tu departamento cuenta. Se mostrará como íconos de
              confianza en la lista pública de renta corta.
            </Text>
            {[
              { key: "antirruido", label: "Dispositivo antirruido" },
              { key: "noFumar", label: 'Señalética de "no fumar"' },
              { key: "sensor", label: "Sensor de incendio / gas / CO2" },
            ].map((op) => (
              <View
                key={op.key}
                className="flex-row items-center justify-between py-2.5"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.borderLight,
                }}
              >
                <Text className="text-sm text-gray-900">{op.label}</Text>
                <Toggle
                  value={!!cumplimiento[op.key as keyof typeof cumplimiento]}
                  onChange={(v) =>
                    setCumplimiento((c) => ({ ...c, [op.key]: v }))
                  }
                />
              </View>
            ))}
            <View className="flex-row items-center justify-between py-2.5">
              <Text className="text-sm text-gray-900 flex-1">
                Ocultar número de departamento en la lista pública
              </Text>
              <Toggle value={ocultarNumero} onChange={setOcultarNumero} />
            </View>
          </View>

          {/* Guestbook */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Información del alojamiento — Guestbook
            </Text>
            <View className="flex-col gap-3">
              <Input
                label="Wi-Fi (nombre)"
                value={guestbook.wifiName}
                onChangeText={(v) =>
                  setGuestbook((p) => ({ ...p, wifiName: v }))
                }
                placeholder="Nombre de red"
              />
              <Input
                label="Contraseña Wi-Fi"
                value={guestbook.wifiPassword}
                onChangeText={(v) =>
                  setGuestbook((p) => ({ ...p, wifiPassword: v }))
                }
                placeholder="Contraseña"
              />
              <Input
                label="Contraseña de la puerta"
                value={guestbook.doorPassword}
                onChangeText={(v) =>
                  setGuestbook((p) => ({ ...p, doorPassword: v }))
                }
                placeholder="Código / contraseña"
              />
              <View>
                <Text
                  className="text-sm mb-1"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Instrucciones adicionales
                </Text>
                <Input
                  value={guestbook.instructions}
                  onChangeText={(v) =>
                    setGuestbook((p) => ({ ...p, instructions: v }))
                  }
                  placeholder="Instrucciones de acceso..."
                  multiline
                />
              </View>
              <View>
                <Text
                  className="text-sm mb-1"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Notas del alojamiento
                </Text>
                <Input
                  value={guestbook.notes}
                  onChangeText={(v) =>
                    setGuestbook((p) => ({ ...p, notes: v }))
                  }
                  placeholder="Notas adicionales..."
                  multiline
                />
              </View>
            </View>
          </View>

          <Button
            variant="primary"
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Guardar configuración"}
          </Button>
        </>
      )}

      <View className="h-6" />

      {/*
        El modal de pago es el compartido: esta pantalla tenía el suyo propio,
        copiado, y los dos llevaban el formulario de tarjeta y el `$15.00`
        escrito a mano.
      */}
      <SuscripcionPagoModal
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        precio={precio}
        pagoSimulado={pagoSimulado}
        procesando={paymentLoading}
        onIrAlPago={irAlPago}
        onConfirmarSimulado={() => confirmarPago(null)}
      />
    </ScrollView>
  );
}
