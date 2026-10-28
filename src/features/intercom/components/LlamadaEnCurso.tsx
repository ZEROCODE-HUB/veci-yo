import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  /** Con quién: «Portería» o «Vivienda 102». */
  etiqueta: string;
  /** «Llamando…», «Conectando…» o «En llamada». */
  situacion: string;
  /** El tiempo de la llamada ya contestada, o nada mientras suena. */
  tiempo?: string;
  silencio: boolean;
  onSilenciar: () => void;
  onColgar: () => void;
}

/**
 * La llamada en curso del intercomunicador.
 *
 * Era una línea de texto y dos botones planos (Para Claude, 21/10/2026:
 * «mejorar la interfaz de la llamada en curso»). Ahora se ve con quién se
 * habla, si está sonando o ya contestaron, el tiempo en grande, y los dos
 * controles redondos de cualquier teléfono: silenciar y colgar.
 */
export function LlamadaEnCurso({
  etiqueta,
  situacion,
  tiempo,
  silencio,
  onSilenciar,
  onColgar,
}: Props) {
  return (
    <View className="items-center gap-5 py-2">
      <View
        className="h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: theme.colors.infoBg }}
      >
        <Ionicons
          name={
            etiqueta === "Portería"
              ? "shield-checkmark"
              : etiqueta === "Administración"
                ? "business"
                : "home"
          }
          size={44}
          color={theme.colors.secondary}
        />
      </View>

      <View className="items-center gap-1">
        <Text className="text-xl font-bold text-gray-900">{etiqueta}</Text>
        <Text className="text-sm text-gray-500">{situacion}</Text>
        {tiempo ? (
          <Text
            className="text-3xl font-bold text-gray-900 mt-1"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {tiempo}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-start justify-center gap-10 mt-1">
        <View className="items-center gap-1.5">
          <Pressable
            onPress={onSilenciar}
            accessibilityRole="button"
            accessibilityLabel={silencio ? "Activar micrófono" : "Silenciar"}
            aria-pressed={silencio}
            accessibilityState={{ selected: silencio }}
            className="h-16 w-16 items-center justify-center rounded-full"
            /*
              Con los colores de `llamadaControl*` --pensados para fondo oscuro,
              blancos translúcidos-- el botón no se veía sobre la ventana blanca
              (Para Claude, 21/10/2026).
            */
            style={{
              backgroundColor: silencio ? theme.colors.text : theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Ionicons
              name={silencio ? "mic-off" : "mic"}
              size={28}
              color={silencio ? theme.colors.textInverse : theme.colors.text}
            />
          </Pressable>
          <Text className="text-xs text-gray-600">
            {silencio ? "Micrófono apagado" : "Silenciar"}
          </Text>
        </View>

        <View className="items-center gap-1.5">
          <Pressable
            onPress={onColgar}
            accessibilityRole="button"
            accessibilityLabel="Colgar"
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.danger }}
          >
            <Ionicons
              name="call"
              size={28}
              color={theme.colors.textInverse}
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </Pressable>
          <Text className="text-xs text-gray-600">Colgar</Text>
        </View>
      </View>
    </View>
  );
}
