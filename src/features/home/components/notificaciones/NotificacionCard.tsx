import React from "react";
import { Pressable, View, Text } from "react-native";
import type { Notificacion } from "../../types";

interface NotificacionCardProps {
  notificacion: Notificacion;
  onPress?: (notificacion: Notificacion) => void;
}

export function NotificacionCard({
  notificacion,
  onPress,
}: NotificacionCardProps) {
  const contenido = (
    <View
      className="flex-row items-start gap-3 bg-white rounded-xl p-3.5"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderLeftWidth: notificacion.leida ? 0 : 1.5,
        borderLeftColor: "#FFF8E1",
      }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: "#F9FAFB" }}
      >
        <Text style={{ fontSize: 20 }}>{notificacion.emoji}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          {!notificacion.leida && (
            <View
              className="rounded-full"
              style={{ width: 8, height: 8, backgroundColor: "#EF4444" }}
            />
          )}
          <Text className="text-base font-bold text-gray-900">
            {notificacion.titulo}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 mt-1 leading-5">
          {notificacion.mensaje}
        </Text>
        <Text className="text-xs text-gray-400 mt-1.5">
          🕐 {notificacion.hora} · {notificacion.fecha}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return contenido;
  return <Pressable onPress={() => onPress(notificacion)}>{contenido}</Pressable>;
}

