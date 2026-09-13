import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "@/shared/components";

export function AdminRow({
  title,
  subtitle,
  status,
  onPress,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-gray-100 py-3"
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">{title}</Text>
        {subtitle && (
          <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
        )}
      </View>
      {status && <Badge status={status}>{status}</Badge>}
      {onDelete && (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="p-2"
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      )}
      {onPress && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
    </Pressable>
  );
}
