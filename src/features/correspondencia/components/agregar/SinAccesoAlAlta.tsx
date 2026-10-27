import React from "react";
import { Text, View } from "react-native";

/** Quien no puede registrar correspondencia ve por qué. */
export function SinAccesoAlAlta({ mensaje }: { mensaje: string }) {
  return (
    <View className="flex-1 bg-bg-app items-center justify-center px-4">
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
      <Text className="text-base text-gray-500 text-center">{mensaje}</Text>
    </View>
  );
}
