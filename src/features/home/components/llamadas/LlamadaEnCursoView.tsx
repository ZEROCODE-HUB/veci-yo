import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LlamadaEnCursoViewProps {
  depto: string;
  persona: string;
  segundos: number;
  silenciada: boolean;
  onToggleSilencio: () => void;
  onColgar: () => void;
}

export function LlamadaEnCursoView({
  depto,
  persona,
  segundos,
  silenciada,
  onToggleSilencio,
  onColgar,
}: LlamadaEnCursoViewProps) {
  const tiempo = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(
    segundos % 60,
  ).padStart(2, "0")}`;

  return (
    <View className="flex-1" style={{ backgroundColor: "#9BA3AE" }}>
      <View className="flex-1 p-4">
        <View
          className="rounded-2xl flex-col items-center gap-2"
          style={{
            backgroundColor: "#9BA3AE",
            paddingVertical: 24,
            paddingHorizontal: 16,
            minHeight: 520,
          }}
        >
          <View
            className="rounded-2xl items-center"
            style={{
              backgroundColor: "#FFFFFF",
              paddingVertical: 14,
              paddingHorizontal: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-lg font-bold text-gray-900">{depto}</Text>
            <Text className="text-base" style={{ color: "#6B7280" }}>
              {persona}
            </Text>
            <View className="mt-2" style={{ width: 40, height: 2, backgroundColor: "#E5E7EB" }} />
          </View>

          <View className="flex-1 items-center justify-center">
            <View className="items-center">
              <Text className="text-4xl text-white text-center" style={{ lineHeight: 48 }}>
                Llamada{"\n"}en curso
              </Text>
              <Text className="text-5xl text-white mt-2">{tiempo}</Text>
            </View>
          </View>

          <View className="items-center gap-3 mt-auto">
            <Pressable
              onPress={onToggleSilencio}
              className="w-[52px] h-[52px] rounded-full items-center justify-center"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.5)",
              }}
            >
              <Ionicons
                name={silenciada ? "volume-mute" : "volume-high"}
                size={24}
                color="white"
              />
            </Pressable>

            <View className="items-center gap-1.5">
              <Pressable
                onPress={onColgar}
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "#EF4444",
                  shadowColor: "#EF4444",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
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
              <Text className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Cortar
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

