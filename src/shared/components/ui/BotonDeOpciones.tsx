import { theme } from "@/config";
import React from "react";
import { Pressable, Text } from "react-native";

interface BotonDeOpcionesProps {
  /** Qué abre, para el lector de pantalla: «Opciones de esta visita». */
  etiqueta: string;
  onPress: () => void;
}

/**
 * El «⋮» de una tarjeta que abre sus opciones.
 *
 * Era un «⋮» suelto de 28 px: en el celular costaba acertarle, no se
 * distinguía del resto de la tarjeta y un toque un poco desviado abría el
 * detalle (Para Claude 166 en correspondencia; 222 en visitas, 04/11/2026).
 * Ahora es un botón redondo de 40 px con borde y sombra, el toque cuenta un
 * poco más allá de su borde y no llega a la tarjeta de debajo.
 */
export function BotonDeOpciones({ etiqueta, onPress }: BotonDeOpcionesProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      className="ml-1 h-10 w-10 items-center justify-center rounded-full bg-white"
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: theme.colors.borderStrong,
        boxShadow: theme.shadows.card,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 20, lineHeight: 22, color: theme.colors.textSecondary }}>⋮</Text>
    </Pressable>
  );
}
