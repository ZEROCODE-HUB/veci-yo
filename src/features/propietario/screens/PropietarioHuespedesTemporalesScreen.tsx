import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Select, Toggle, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { useHuespedesTemporales } from "../hooks/useHuespedesTemporales";

const SECTION_CARD = {
  backgroundColor: "#fff",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

export function PropietarioHuespedesTemporalesScreen() {
  const navigation = useNavigation();
  const { addToast } = useUIStore();
  const {
    tieneSuscripcion,
    minDias,
    setMinDias,
    maxHuespedes,
    setMaxHuespedes,
    politicaMascotas,
    setPoliticaMascotas,
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
    paymentForm,
    setPaymentForm,
    paymentLoading,
    showWarningModal,
    setShowWarningModal,
    togglePlataforma,
    handleCardNumberInput,
    handleCardExpiryInput,
    handleSubscribeAndPay,
  } = useHuespedesTemporales();

  const handleGuardar = () => {
    addToast("Configuración guardada exitosamente", "success");
    navigation.goBack();
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
          <Button variant="primary" onPress={() => setShowPayment(true)}>
            Suscribirse
          </Button>
        </View>
      )}

      {tieneSuscripcion && (
        <>
          {/* Parámetros de estancia y aforo */}
          <View className="rounded-2xl p-5" style={SECTION_CARD}>
            <Text className="text-base font-bold text-center text-gray-900 mb-4">
              Parámetros de estancia y aforo
            </Text>
            <View
              className="rounded-xl p-3 mb-3.5 flex-row gap-2 items-start"
              style={{ backgroundColor: "#FEF9C3" }}
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text
                className="text-xs flex-1"
                style={{ color: "#854D0E", lineHeight: 18 }}
              >
                El Administrador ha configurado un mínimo de{" "}
                <Text className="font-bold">1 noche(s)</Text> y una capacidad
                máxima de <Text className="font-bold">6 huéspedes</Text> para
                este condominio. Puedes establecer valores más restrictivos,
                pero no menos.
              </Text>
            </View>
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
                  Política de mascotas
                </Text>
                <View className="w-[140px]">
                  <Select
                    value={politicaMascotas}
                    options={["permitidas", "no-permitidas"]}
                    onChange={(v) => setPoliticaMascotas(String(v))}
                    placeholder="Seleccione"
                  />
                </View>
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
              <Text className="text-sm flex-1" style={{ color: "#6B7280" }}>
                Estacionamientos disponibles para visitantes
              </Text>
            </View>
            <View
              className="rounded-xl p-3 mt-3"
              style={{ backgroundColor: "#F9FAFB" }}
            >
              <Text
                className="text-xs"
                style={{ color: "#9CA3AF", lineHeight: 18 }}
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
                  style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
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
                          style={{ color: "#16A34A" }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#16A34A"
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
                style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
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
                    style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                  >
                    <Text className="text-xs" style={{ color: "#6B7280" }}>
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
                  backgroundColor: pms.activo ? "#F5B800" : "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: pms.activo ? "#F5B800" : "#E5E7EB",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: pms.activo ? "#fff" : "#111827" }}
                >
                  Sí
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPms({ activo: false, cual: "" })}
                className="rounded-full px-6 py-2"
                style={{
                  backgroundColor: !pms.activo ? "#F5B800" : "#F9FAFB",
                  borderWidth: 1.5,
                  borderColor: !pms.activo ? "#F5B800" : "#E5E7EB",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: !pms.activo ? "#fff" : "#111827" }}
                >
                  No
                </Text>
              </Pressable>
            </View>
            <View className="flex-col gap-3">
              <View
                className="flex-row items-center gap-2.5 p-3 rounded-xl"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
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
                  style={{ color: "#6B7280" }}
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
              style={{ color: "#6B7280" }}
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
                        ? "#F5B800"
                        : "#E5E7EB",
                    backgroundColor:
                      permiteVisitasHuespedes === op.value
                        ? "#FFF8E1"
                        : "#F9FAFB",
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{
                      borderWidth: 2,
                      borderColor:
                        permiteVisitasHuespedes === op.value
                          ? "#F5B800"
                          : "#E5E7EB",
                    }}
                  >
                    {permiteVisitasHuespedes === op.value && (
                      <View
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: "#F5B800" }}
                      />
                    )}
                  </View>
                  <Text className="text-sm text-gray-900">{op.label}</Text>
                </Pressable>
              ))}
              <View
                className="rounded-xl p-3"
                style={{ backgroundColor: "#F9FAFB" }}
              >
                <Text
                  className="text-xs"
                  style={{ color: "#9CA3AF", lineHeight: 18 }}
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
                style={{ color: "#6B7280" }}
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
              style={{ color: "#6B7280" }}
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
                style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
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
                <Text className="text-sm mb-1" style={{ color: "#6B7280" }}>
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
                <Text className="text-sm mb-1" style={{ color: "#6B7280" }}>
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

          <Button variant="primary" onPress={handleGuardar}>
            Guardar configuración
          </Button>
        </>
      )}

      <View className="h-6" />

      {/* Payment Modal */}
      <Modal
        visible={showPayment}
        onClose={() => {
          if (!paymentLoading) setShowPayment(false);
        }}
        title="Suscripción a Huéspedes Temporales"
      >
        <View className="flex-col gap-4 py-1">
          <View
            className="items-center py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <Text className="text-xl font-bold text-gray-900 text-center">
              $15.00
            </Text>
            <Text className="text-sm text-center" style={{ color: "#6B7280" }}>
              por mes
            </Text>
          </View>
          <Input
            label="Nombre del titular"
            value={paymentForm.cardName}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, cardName: v }))}
            placeholder="Como figura en la tarjeta"
          />
          <Input
            label="Numero de tarjeta"
            value={paymentForm.cardNumber}
            onChangeText={handleCardNumberInput}
            placeholder="1234 5678 9012 3456"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Vencimiento"
                value={paymentForm.cardExpiry}
                onChangeText={handleCardExpiryInput}
                placeholder="MM/AA"
              />
            </View>
            <View className="flex-1">
              <Input
                label="CVV"
                value={paymentForm.cardCvv}
                onChangeText={(v) =>
                  setPaymentForm((p) => ({
                    ...p,
                    cardCvv: v.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                placeholder="123"
              />
            </View>
          </View>
          <View
            className="rounded-xl p-3"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <Text
              className="text-xs"
              style={{ color: "#2563EB", lineHeight: 18 }}
            >
              Pago 100% simulado. No se realizará ningún cobro real.
            </Text>
          </View>
          <Button
            variant="primary"
            onPress={handleSubscribeAndPay}
            disabled={paymentLoading}
          >
            {paymentLoading
              ? "Procesando pago..."
              : "Pagar $15.00 y suscribirse"}
          </Button>
        </View>
      </Modal>

      {/* Warning Modal */}
      <Modal
        visible={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        title="Límite de aforo excedido"
      >
        <View className="flex-col gap-4 text-center">
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text className="text-base text-gray-900" style={{ lineHeight: 22 }}>
            La capacidad configurada supera el límite de aforo establecido por
            el Administrador.
          </Text>
          <Text className="text-sm" style={{ color: "#6B7280" }}>
            Se notificará al Administrador para que apruebe o rechace la
            modificación.
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                variant="secondary"
                onPress={() => setShowWarningModal(false)}
              >
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="primary"
                onPress={() => setShowWarningModal(false)}
              >
                Solicitar aprobación
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
