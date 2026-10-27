import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";

/** La casilla de la administración para anotar una visita que viene a verla a ella. */
export function VisitaParaAdministracion({
  valor,
  onCambiar,
}: {
  valor: boolean;
  onCambiar: (v: boolean) => void;
}) {
  return (
    <View
      className="rounded-xl p-3"
      style={{ backgroundColor: theme.colors.bgMuted, borderWidth: 1, borderColor: theme.colors.border }}
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Visita para administración"
          accessibilityState={{ checked: valor }}
          aria-checked={valor}
          onPress={() => onCambiar(!valor)}
          className="w-5 h-5 rounded border items-center justify-center"
          style={{
            borderWidth: 2,
            borderColor: valor ? theme.colors.secondary : theme.colors.borderStrong,
            backgroundColor: valor ? theme.colors.secondary : "transparent",
          }}
        >
          {valor && <Ionicons name="checkmark" size={14} color="white" />}
        </Pressable>
        <Pressable onPress={() => onCambiar(!valor)} className="flex-1">
          <Text className="text-sm text-gray-900 font-medium">Visita para administración</Text>
        </Pressable>
      </View>
    </View>
  );
}
