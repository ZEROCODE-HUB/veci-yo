import React from "react";
import { Text, View } from "react-native";
import { Toggle } from "@/shared/components/ui";

interface Props {
  texto: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  /** Para el lector de pantalla, si el texto solo no basta. */
  nombre?: string;
  negrita?: boolean;
}

/**
 * Un rótulo a la izquierda y su interruptor a la derecha, como en Permisos.
 * El rótulo cede sitio; el interruptor no.
 */
export function FilaConInterruptor({ texto, value, onChange, disabled, nombre, negrita }: Props) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className={`flex-1 text-sm ${negrita ? "font-semibold text-gray-900" : "text-gray-700"}`}>{texto}</Text>
      <Toggle value={value} onChange={onChange} disabled={disabled} accessibilityLabel={nombre ?? texto} />
    </View>
  );
}
