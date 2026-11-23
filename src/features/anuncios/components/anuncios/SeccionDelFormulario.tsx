import { theme } from "@/config";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

/**
 * Un bloque del formulario de encuesta con su título y, si hace falta, una
 * línea que dice para qué sirve (17/11/2026). Antes todo iba seguido y no se
 * distinguía dónde acababan las opciones y empezaban las reglas.
 *
 * `obligatorio` pinta el asterisco rojo junto al título, como el resto de
 * campos (cliente, 23/11/2026: «Opciones» tiene que verse obligatoria), y
 * `error` dice debajo del título qué falta.
 */
export function SeccionDelFormulario({
  titulo,
  ayuda,
  obligatorio = false,
  error,
  children,
}: {
  titulo: string;
  ayuda?: string;
  obligatorio?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View
      className={`gap-2 rounded-xl border p-3 ${error ? "border-red-500" : "border-gray-200"}`}
    >
      <View className="gap-0.5">
        <Text className="text-sm font-bold text-gray-900">
          {titulo}
          {obligatorio ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
        </Text>
        {ayuda ? <Text className="text-xs leading-4 text-gray-500">{ayuda}</Text> : null}
        {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
      </View>
      {children}
    </View>
  );
}
