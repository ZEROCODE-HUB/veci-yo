import React from "react";
import { Text, View } from "react-native";

interface Props {
  titulo: string;
  cuantas: number;
}

/** El rótulo que separa Hoy, Dentro y Mañana en la lista de la portería. */
export function TituloDeGrupo({ titulo, cuantas }: Props) {
  return (
    <View
      accessibilityRole="header"
      className="flex-row items-baseline gap-2 pt-2"
    >
      <Text className="text-base font-bold text-gray-900">{titulo}</Text>
      <Text className="text-xs text-gray-500">{cuantas}</Text>
    </View>
  );
}
