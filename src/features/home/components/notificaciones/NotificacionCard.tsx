import { theme } from "@/config";
import React from "react";
import { Pressable, View, Text } from "react-native";
import type { Notificacion } from "../../types";

interface NotificacionCardProps {
  notificacion: Notificacion;
  onPress?: (notificacion: Notificacion) => void;
  /** De qué vivienda y rol es: «Depto 102 · Propietario» (10/11/2026). */
  deDonde?: string;
}

export function NotificacionCard({
  notificacion,
  onPress,
  deDonde,
}: NotificacionCardProps) {
  const contenido = (
    <View
      className="flex-row items-start gap-3 bg-white rounded-xl p-3.5"
      style={{
        boxShadow: theme.shadows.card,
        borderLeftWidth: notificacion.leida ? 0 : 1.5,
        borderLeftColor: theme.colors.primaryLight,
      }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: theme.colors.bgMuted }}
      >
        <Text style={{ fontSize: 20 }}>{notificacion.emoji}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          {!notificacion.leida && (
            <View
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: theme.colors.danger,
              }}
            />
          )}
          <Text className="text-base font-bold text-gray-900">
            {notificacion.titulo}
          </Text>
        </View>
        {deDonde ? (
          <View
            className="self-start rounded-full px-2 py-0.5 mt-1"
            style={{ backgroundColor: theme.colors.primaryLight }}
          >
            <Text className="text-2xs font-semibold" style={{ color: theme.colors.iconAmberDark }}>
              {deDonde}
            </Text>
          </View>
        ) : null}
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
  return (
    <Pressable onPress={() => onPress(notificacion)}>{contenido}</Pressable>
  );
}
