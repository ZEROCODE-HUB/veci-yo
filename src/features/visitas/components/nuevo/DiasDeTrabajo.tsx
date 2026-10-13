import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { DIAS_DE_LA_SEMANA, textoDeDias } from "../../helpers/diasDeTrabajo";

interface DiasDeTrabajoProps {
  dias: number[];
  onCambiar: (dias: number[]) => void;
}

/**
 * Los días en que viene un profesional permanente.
 *
 * No había dónde elegirlos (13/10/2026). La portería marca su entrada y su
 * salida cada día; si viene uno que no es de los suyos, lo ve avisado.
 */
export function DiasDeTrabajo({ dias, onCambiar }: DiasDeTrabajoProps) {
  const alternar = (valor: number) =>
    onCambiar(
      dias.includes(valor)
        ? dias.filter((dia) => dia !== valor)
        : [...dias, valor],
    );

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-900">
        Días en que viene
      </Text>
      <View className="flex-row gap-1.5">
        {DIAS_DE_LA_SEMANA.map((dia) => {
          const elegido = dias.includes(dia.valor);
          return (
            <Pressable
              key={dia.valor}
              onPress={() => alternar(dia.valor)}
              accessibilityRole="checkbox"
              accessibilityLabel={dia.nombre}
              // Los dos: react-native-web no traduce `accessibilityState`.
              aria-checked={elegido}
              accessibilityState={{ checked: elegido }}
              className="flex-1 items-center rounded-lg border py-2"
              style={{
                borderColor: elegido
                  ? theme.colors.primary
                  : theme.colors.borderLight,
                backgroundColor: elegido
                  ? theme.colors.primary
                  : theme.colors.bgCard,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: elegido
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary,
                }}
              >
                {dia.letra}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs leading-5 text-gray-500">
        {dias.length
          ? `${textoDeDias(dias)}. La portería registra su entrada y su salida cada día.`
          : "Elige al menos un día."}
      </Text>
    </View>
  );
}
