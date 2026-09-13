import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LlamadaPanelProps {
  avatarEmoji: string;
  onLlamar: () => void;
  onRechazar: () => void;
}

export function LlamadaPanel({
  avatarEmoji,
  onLlamar,
  onRechazar,
}: LlamadaPanelProps) {
  return (
    <View
      className="rounded-2xl items-center gap-8 mt-2"
      style={{
        backgroundColor: "#FFFFFF",
        paddingVertical: 32,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="w-[140px] h-[140px] rounded-full items-center justify-center"
        style={{ backgroundColor: "#5B9BD5" }}
      >
        <Text style={{ fontSize: 64 }}>{avatarEmoji}</Text>
      </View>

      <View className="flex-row justify-between w-full" style={{ paddingHorizontal: 24 }}>
        <View className="items-center gap-2">
          <Pressable
            onPress={onLlamar}
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{
              backgroundColor: "#16A34A",
              shadowColor: "#16A34A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <Ionicons name="call" size={28} color="white" />
          </Pressable>
          <Text className="text-xs text-center" style={{ color: "#6B7280" }}>
            Llamar{"\n"}Aceptar
          </Text>
        </View>

        <View className="items-center gap-2">
          <Pressable
            onPress={onRechazar}
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{
              backgroundColor: "#EF4444",
              shadowColor: "#EF4444",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <Ionicons
              name="call-outline"
              size={28}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </Pressable>
          <Text className="text-xs text-center" style={{ color: "#6B7280" }}>
            Rechazar{"\n"}Cortar
          </Text>
        </View>
      </View>
    </View>
  );
}

