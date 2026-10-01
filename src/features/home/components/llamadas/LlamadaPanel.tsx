import { theme } from "@/config";
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
        backgroundColor: theme.colors.bgCard,
        paddingVertical: 32,
        paddingHorizontal: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="w-[140px] h-[140px] rounded-full items-center justify-center"
        style={{ backgroundColor: theme.colors.chatAcento }}
      >
        <Text style={{ fontSize: 64 }}>{avatarEmoji}</Text>
      </View>

      <View
        className="flex-row justify-between w-full"
        style={{ paddingHorizontal: 24 }}
      >
        <View className="items-center gap-2">
          {/*
            Verde y rojo, redondos, el mismo tamaño: sin nombre solo los
            distingue el color, y quien no lo ve tiene una probabilidad entre
            dos de colgar en vez de contestar.
          */}
          <Pressable
            onPress={onLlamar}
            accessibilityRole="button"
            accessibilityLabel="Llamar o aceptar la llamada"
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{
              backgroundColor: theme.colors.success,
              shadowColor: theme.colors.success,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <Ionicons name="call" size={28} color="white" />
          </Pressable>
          <Text
            className="text-xs text-center"
            style={{ color: theme.colors.textSecondary }}
          >
            Llamar{"\n"}Aceptar
          </Text>
        </View>

        <View className="items-center gap-2">
          <Pressable
            onPress={onRechazar}
            accessibilityRole="button"
            accessibilityLabel="Rechazar la llamada"
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{
              backgroundColor: theme.colors.danger,
              shadowColor: theme.colors.danger,
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
          <Text
            className="text-xs text-center"
            style={{ color: theme.colors.textSecondary }}
          >
            Rechazar{"\n"}Cortar
          </Text>
        </View>
      </View>
    </View>
  );
}
