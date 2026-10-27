import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { formatDateTime } from "@/shared/utils";

/**
 * Cuándo aceptó el reglamento quien reservó, y el texto que aceptó (hueco 41,
 * 27/10/2026). Sirve si se discute la fianza: el reglamento puede haber
 * cambiado después, y aquí queda el de ese día.
 */
export function ReglamentoAceptado({
  aceptadoEn,
  texto,
}: {
  aceptadoEn?: string;
  texto?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <View>
      <Text className="mb-1 text-sm text-gray-500">Reglamento de la zona</Text>
      <Text className="text-sm text-gray-900">
        {aceptadoEn
          ? `Aceptado el ${formatDateTime(new Date(aceptadoEn))}`
          : "Sin constancia (reserva anterior al 27/10/2026)"}
      </Text>
      {aceptadoEn && texto ? (
        <>
          <Pressable
            onPress={() => setAbierto((v) => !v)}
            accessibilityRole="button"
            aria-expanded={abierto}
            accessibilityState={{ expanded: abierto }}
          >
            <Text className="mt-1 text-xs underline" style={{ color: theme.colors.primary }}>
              {abierto ? "Ocultar lo que aceptó" : "Ver lo que aceptó"}
            </Text>
          </Pressable>
          {abierto ? (
            <Text className="mt-1 text-xs leading-5 text-gray-700">{texto}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
