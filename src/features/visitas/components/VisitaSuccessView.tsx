import { theme } from "@/config";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { Badge, Button } from "@/shared/components";
import { TIPO_LABELS } from "../constants";
import { formatDate } from "@/shared/utils";

interface VisitaSuccessViewProps {
  tipoSeleccionado: string | null;
  nombre: string;
  fecha: Date;
  esHT: boolean;
  onVolver: () => void;
}

export function VisitaSuccessView({
  tipoSeleccionado,
  nombre,
  fecha,
  esHT,
  onVolver,
}: VisitaSuccessViewProps) {
  const [copiado, setCopiado] = useState(false);
  const tipoLabel = tipoSeleccionado
    ? TIPO_LABELS[tipoSeleccionado] || tipoSeleccionado
    : "";
  const fechaStr = formatDate(fecha);

  const handleCopiar = () => {
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 bg-white">
      <View
        className="w-full rounded-2xl p-5 gap-3"
        style={{
          backgroundColor: theme.colors.bgMuted,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.border }}
          >
            <Ionicons
              name={esHT ? "bed" : "people"}
              size={24}
              color={theme.colors.textSecondary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">{nombre}</Text>
            <Text className="text-sm text-gray-500">{tipoLabel}</Text>
          </View>
          <Badge status="Pendiente" />
        </View>
        <View className="flex-row gap-2 mt-1">
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: theme.colors.borderLight }}
          >
            <Text className="text-xs text-gray-500">📅 {fechaStr}</Text>
          </View>
        </View>
      </View>

      <Text className="text-5xl">✅</Text>
      <Text className="text-xl font-bold text-gray-900 text-center">
        {esHT ? "Reserva creada" : "Visita creada"}
      </Text>
      <Text className="text-sm text-gray-500 text-center">
        {esHT
          ? "La reserva fue registrada correctamente."
          : "La visita fue registrada correctamente."}
      </Text>

      {esHT && (
        <View className="w-full gap-2">
          <Text className="text-xs text-gray-500 text-center">
            Compartí este mensaje con tu huésped:
          </Text>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text className="text-sm text-gray-700 text-center leading-5">
              Hola {nombre}, tu reserva de {tipoLabel} está confirmada para el{" "}
              {fechaStr}. Te esperamos!
            </Text>
          </View>
          <Pressable
            onPress={handleCopiar}
            className="rounded-full py-2 px-4 items-center"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Text className="text-sm font-bold text-white">
              {copiado ? "✓ Copiado" : "Copiar"}
            </Text>
          </Pressable>
        </View>
      )}

      <Button onPress={onVolver}>Volver al historial</Button>
    </View>
  );
}
