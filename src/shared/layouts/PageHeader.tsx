import { theme } from "@/config";
import React, { useState } from "react";
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
  /*
    Los dos lados miden lo que mida la acción (al menos 32): tenían 32 fijos y
    una acción más ancha --un botón de 36, un «+ Crear PQRS», dos iconos-- se
    montaba sobre el título en un celular de 320 (auditoría de responsividad,
    25/10/2026). El lado del «volver» copia ese ancho para que el título siga
    centrado.
  */
  const [anchoLado, setAnchoLado] = useState(32);
  const accion = action ?? options?.headerRight?.({});

  return (
    <View className="flex-row items-center px-4 py-3.5 bg-white border-b border-gray-100">
      {/* Back */}
      <View className="items-start" style={{ width: anchoLado }}>
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
      <Text
        numberOfLines={2}
        className="flex-1 mx-1 text-lg font-bold text-gray-900 text-center"
      >
        {titleHeader}
      </Text>

      {/* Action */}
      <View
        className="items-end"
        style={{ minWidth: 32, flexShrink: 0 }}
        onLayout={(e) => {
          const ancho = Math.max(32, Math.ceil(e.nativeEvent.layout.width));
          if (ancho !== anchoLado) setAnchoLado(ancho);
        }}
      >
        {accion}
      </View>
    </View>
  );
}
