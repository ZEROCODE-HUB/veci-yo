import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";

/**
 * El aviso de que registrar huéspedes temporales pide la suscripción de renta
 * corta. Salió de `VisitasHistorialScreen` el 26/10/2026.
 */
export function AvisoSinRentaCorta() {
  return (
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
          Puedes activarlo desde Configuración {">"} Huéspedes Temporales o
          tocando el card Huésped Temporal.
        </Text>
      </View>
    </View>
  );
}
