import React from "react";
import { Text, View } from "react-native";

/** Para quien no puede usar Visitas. Salió de `VisitasHistorialScreen` el 26/10/2026. */
export function SinAccesoAVisitas() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Text className="text-4xl mb-2">🚫</Text>
      <Text className="text-base text-gray-500 text-center">
        No tienes acceso a Visitas. Solo los Residentes pueden usar esta función.
      </Text>
      <Text className="text-sm text-gray-400 text-center">
        Si eres Propietario, declárate como Residente desde Configuración.
      </Text>
    </View>
  );
}
