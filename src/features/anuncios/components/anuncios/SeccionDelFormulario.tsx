import type { ReactNode } from "react";
import { Text, View } from "react-native";

/**
 * Un bloque del formulario de encuesta con su título y, si hace falta, una
 * línea que dice para qué sirve (17/11/2026). Antes todo iba seguido y no se
 * distinguía dónde acababan las opciones y empezaban las reglas.
 */
export function SeccionDelFormulario({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View className="gap-0.5">
        <Text className="text-sm font-bold text-gray-900">{titulo}</Text>
        {ayuda ? <Text className="text-xs leading-4 text-gray-500">{ayuda}</Text> : null}
      </View>
      {children}
    </View>
  );
}
