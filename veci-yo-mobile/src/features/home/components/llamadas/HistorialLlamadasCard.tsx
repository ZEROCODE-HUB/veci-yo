import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LlamadaHistorial } from "@/shared/types";

interface HistorialLlamadasCardProps {
  historial: LlamadaHistorial[];
  persona: string;
}

export function HistorialLlamadasCard({ historial }: HistorialLlamadasCardProps) {
  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-sm font-semibold text-gray-900 mb-2.5">
        Historial de llamadas
      </Text>
      {historial.length === 0 ? (
        <Text className="text-xs text-center py-2" style={{ color: "#9CA3AF" }}>
          Sin llamadas registradas
        </Text>
      ) : (
        historial.map((llamada) => (
          <View
            key={llamada.id}
            className="flex-row justify-between items-center py-2"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
          >
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name={llamada.tipo === "perdida" ? "call-outline" : "call"}
                size={14}
                color={llamada.tipo === "perdida" ? "#EF4444" : "#16A34A"}
              />
              <Text className="text-xs text-gray-900">
                {llamada.fecha} {llamada.hora}
              </Text>
            </View>
            <Text
              className="text-xs font-medium"
              style={{ color: llamada.tipo === "perdida" ? "#EF4444" : "#16A34A" }}
            >
              {llamada.tipo === "perdida" ? "Perdida" : "Saliente"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

