import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import type { VisitaItem } from "@/shared/types";
import { recorridoDeLaEstancia } from "../helpers/recorridoDeLaEstancia";

/**
 * La estancia de punta a punta: de la reserva a la salida (14/10/2026).
 * La regla, en `recorridoDeLaEstancia`.
 */
export function RecorridoDeLaEstancia({ visita }: { visita: VisitaItem }) {
  const pasos = recorridoDeLaEstancia(visita);
  const completa = pasos[pasos.length - 1]?.hecho ?? false;

  return (
    <View className="rounded-2xl bg-white p-4 gap-3 shadow-sm">
      <Text className="text-base font-bold text-gray-900">Recorrido de la estancia</Text>
      {completa ? (
        <View className="rounded-xl bg-green-50 p-3">
          <Text className="text-sm font-semibold text-green-700">
            Estancia completa: salieron todos.
          </Text>
        </View>
      ) : null}
      {pasos.map((paso, i) => (
        <View key={paso.clave} className="flex-row gap-3">
          <View className="items-center">
            <View
              className="w-3 h-3 rounded-full mt-1"
              style={{
                backgroundColor: paso.hecho ? theme.colors.success : theme.colors.borderStrong,
              }}
            />
            {i < pasos.length - 1 ? (
              <View
                className="w-0.5 flex-1"
                style={{ backgroundColor: paso.hecho ? theme.colors.success : theme.colors.border }}
              />
            ) : null}
          </View>
          <View className="flex-1 pb-2">
            <Text className="text-sm font-semibold text-gray-900">{paso.titulo}</Text>
            <Text className="text-xs text-gray-600">{paso.detalle}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
