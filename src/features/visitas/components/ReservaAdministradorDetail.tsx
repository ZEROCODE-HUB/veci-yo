import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { VisitaItem } from "@/shared/types";

interface Props {
  item: VisitaItem;
  onBack: () => void;
}

const PASOS = [
  { key: "preregistroEnviado", label: "Link de preregistro enviado", icon: "🔗" },
  { key: "documentacionCompleta", label: "Documentación completada", icon: "📄" },
  { key: "terminosAceptados", label: "Términos y Condiciones aceptados", icon: "📝" },
  { key: "verificacionPasada", label: "Verificación superada", icon: "🛡️" },
  { key: "trasideEntrada", label: "Ingreso al edificio (TRA/SIRE entrada)", icon: "🟢" },
  { key: "trasideSalida", label: "Salida del edificio (TRA/SIRE salida)", icon: "🔴" },
] as const;

function estadoPaso(guest: VisitaItem["invitados"][number], key: string) {
  const timeline = guest.timeline || {};

  if (key === "terminosAceptados") {
    if (timeline.terminosAceptados === true) {
      return timeline.terminosAprobadoPor === "anfitrion" ? "aprobado-manual" : "aprobado";
    }
    if (timeline.terminosAceptados === false) return "rechazado";
    return "pendiente";
  }

  if (key === "verificacionPasada") {
    if (timeline.verificacionAprobada === true) return "aprobada";
    return timeline.verificacionPasada ? "aprobado" : "pendiente";
  }

  return timeline[key as keyof typeof timeline] ? "aprobado" : "pendiente";
}

function PuntoProgreso({ guest }: { guest: VisitaItem["invitados"][number] }) {
  return (
    <View className="flex-row items-center mb-1">
      {PASOS.map((paso, index) => {
        const estado = estadoPaso(guest, paso.key);
        const aprobado = estado === "aprobado" || estado === "aprobada" || estado === "aprobado-manual";

        return (
          <View key={paso.key} className="flex-1 flex-row items-center">
            <View
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: aprobado
                  ? estado === "aprobado-manual"
                    ? "#F5B800"
                    : "#16A34A"
                  : "#D1D5DB",
              }}
            />
            {index < PASOS.length - 1 && (
              <View
                className="flex-1 h-0.5"
                style={{ backgroundColor: aprobado ? "#16A34A" : "#E5E7EB" }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

function DetalleHuesped({ guest }: { guest: VisitaItem["invitados"][number] }) {
  return (
    <View className="gap-2 mt-2.5 pt-2.5 border-t border-gray-200">
      {PASOS.map((paso) => {
        const estado = estadoPaso(guest, paso.key);

        return (
          <View key={paso.key} className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-sm">{paso.icon}</Text>
            <Text className="text-xs text-gray-900 flex-1" numberOfLines={3}>
              {paso.label}
              {estado === "aprobado-manual" && <Text className="text-yellow-700"> (aprobado por anfitrión)</Text>}
              {estado === "aprobada" && <Text className="text-green-600"> (aprobada)</Text>}
            </Text>
          </View>
        );
      })}
      <View className="flex-row items-center gap-2 mt-1 pt-2 border-t border-gray-200 flex-wrap">
        <View className="px-2 py-1 rounded-full bg-amber-100">
          <Text className="text-2xs font-semibold text-amber-800">
            {guest.traSireReported ? "TRA/SIRE reportado" : "TRA/SIRE pendiente"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ReservaAdministradorDetail({ item, onBack }: Props) {
  const guests = item.invitados || [];

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-4 pt-3 pb-8"
      showsVerticalScrollIndicator
    >
      <Pressable onPress={onBack} className="py-2 self-start">
        <Text className="text-sm font-semibold text-primary">← Volver a visitas</Text>
      </Pressable>
      <View className="gap-3">
        {guests.map((guest, index) => (
          <View
            key={`${guest.nombre}-${index}`}
            className="rounded-xl bg-white p-3.5 shadow-sm"
            style={guest.esMenor ? { borderLeftWidth: 4, borderLeftColor: "#F59E0B" } : undefined}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-base font-semibold text-gray-900">{guest.nombre}</Text>
              {guest.esMenor && (
                <View className="px-2 py-0.5 rounded-full bg-amber-100">
                  <Text className="text-2xs font-bold text-amber-800">👶 Menor</Text>
                </View>
              )}
            </View>
            <PuntoProgreso guest={guest} />
            <DetalleHuesped guest={guest} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
