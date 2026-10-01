import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CheckboxProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  error?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  error = false,
}: CheckboxProps) {
  const borderColor = error
    ? theme.colors.danger
    : checked
      ? theme.colors.primary
      : theme.colors.border;
  const bgColor = checked ? theme.colors.primary : theme.colors.bgCard;

  /*
    Con rol y estado. Era un `Pressable` suelto: para un lector de pantalla no
    era una casilla, y no habia forma de saber si estaba marcada --el unico
    indicio es el color del cuadrado y una palomita dibujada--. `Checkbox` lo
    usa media aplicacion: aceptar los terminos de una reserva, marcar una
    cuota como pagada, elegir a quien va un anuncio.
  */
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      /*
        Los dos: `accessibilityState` es lo que entiende React Native, y
        `aria-checked` lo que llega al DOM en web. Comprobado en el navegador:
        con solo `accessibilityState`, el elemento sale con `role="checkbox"` y
        `aria-label`, y **sin `aria-checked`** --react-native-web no lo
        traduce--, asi que un lector de pantalla dice "casilla" y no si esta
        marcada. Es la causa de R-13, que se habia anotado como un olvido.
      */
      accessibilityState={{ checked }}
      aria-checked={checked}
      accessibilityLabel={label}
      className="flex-row items-start gap-3"
    >
      <View
        className="w-[22px] h-[22px] rounded-sm items-center justify-center border"
        style={{ backgroundColor: bgColor, borderColor }}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={14}
            color={theme.colors.textInverse}
          />
        )}
      </View>
      {label && (
        <Text
          className="text-sm text-gray-900 flex-1"
          style={{ lineHeight: 20 }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
