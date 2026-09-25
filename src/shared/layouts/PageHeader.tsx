import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

type PageHeaderProps = Partial<NativeStackHeaderProps> & {
  title?: string;
  onBack?: () => void;
  action?: React.ReactNode;
};

export function PageHeader({
  options,
  title,
  onBack,
  action,
}: PageHeaderProps) {
  const titleHeader = title ?? options?.title ?? "";
  const navigation = useNavigation();

  return (
    <View className="flex-row items-center px-4 py-3.5 bg-white border-b border-gray-100">
      {/* Back */}
      <View className="w-8 items-start">
        {/*
          Es el "volver" de TODAS las pantallas: sin nombre, un lector de
          pantalla anuncia "boton" al principio de cada una.
        */}
        <Pressable
          onPress={onBack ?? navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          className="p-1"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Title */}
      <Text className="flex-1 text-lg font-bold text-gray-900 text-center">
        {titleHeader}
      </Text>

      {/* Action */}
      <View className="w-8 items-end">{action ?? options?.headerRight?.({})}</View>
    </View>
  );
}
