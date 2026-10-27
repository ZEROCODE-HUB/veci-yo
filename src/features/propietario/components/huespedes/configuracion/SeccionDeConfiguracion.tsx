import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";

export const ESTILO_DE_SECCION = {
  backgroundColor: theme.colors.bgCard,
  shadowColor: theme.colors.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

/**
 * Una tarjeta de la configuración de renta corta, con su título y, si lo
 * lleva, la frase que explica para qué sirve.
 */
export function SeccionDeConfiguracion({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-2xl p-5" style={ESTILO_DE_SECCION}>
      <Text
        className={`text-base font-bold text-center text-gray-900 ${subtitulo ? "mb-1" : "mb-4"}`}
      >
        {titulo}
      </Text>
      {subtitulo ? (
        <Text className="mb-4 text-center text-xs leading-5 text-gray-500">{subtitulo}</Text>
      ) : null}
      {children}
    </View>
  );
}
