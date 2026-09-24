import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { getIcon } from "../helpers/correspondencia.helpers";
import type { CorrespondenciaItem } from "@/shared/types";
import { CorrespondenciaEstadoBadge } from "./CorrespondenciaEstadoBadge";

interface CorrespondenciaCardProps {
  item: CorrespondenciaItem;
  puedeModificarEstado: boolean;
  onPress: () => void;
  onMenuPress: () => void;
}

export function CorrespondenciaCard({
  item,
  puedeModificarEstado,
  onPress,
  onMenuPress,
}: CorrespondenciaCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-xl p-3.5 gap-1"
      style={{ boxShadow: theme.shadows.card }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <Text style={{ fontSize: 16 }}>{getIcon(item.empresa)}</Text>
            <Text className="text-base font-semibold text-gray-900">
              {item.empresa}: {item.unidad}
            </Text>
          </View>
          {item.nombre ? (
            <Text className="text-base font-semibold text-gray-900">
              {item.nombre}
            </Text>
          ) : null}
          {item.ci ? (
            <Text className="text-sm text-gray-500">CI: {item.ci}</Text>
          ) : null}
        </View>
        {puedeModificarEstado ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onMenuPress();
            }}
            className="p-1"
          >
            <Text style={{ fontSize: 20, color: theme.colors.textSecondary }}>
              ⋮
            </Text>
          </Pressable>
        ) : (
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textMuted,
              opacity: 0.5,
              padding: 4,
            }}
          >
            ›
          </Text>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center gap-1.5">
          <CorrespondenciaEstadoBadge estado={item.estado} />
          {item.entregaEnPuerta && (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: theme.colors.secondaryLight }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: theme.colors.secondary }}
              >
                🚪 Puerta
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-gray-500">{item.fecha}</Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textMuted,
              opacity: 0.5,
            }}
          >
            ›
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
