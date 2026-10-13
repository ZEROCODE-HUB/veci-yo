import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CheckboxProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  /**
   * El nombre que oye quien usa un lector de pantalla, cuando la etiqueta
   * visible no basta para distinguir una casilla de otra.
   *
   * Hace falta en una lista: en la pantalla de pagos había cuatro casillas
   * llamadas **«Pagado»**, una por vivienda, y la etiqueta visible no dice
   * cuál es cuál porque eso lo dice la fila, que se ve. Quien no la ve oye
   * «Pagado, casilla, marcada» cuatro veces.
   *
   * Si no se da, se usa `label`, que es lo correcto cuando la casilla está
   * sola --«Acepto los términos»--.
   */
  nombreAccesible?: string;
  error?: boolean;
  /**
   * Mientras se guarda lo que la casilla acaba de cambiar. Sin esto, en la
   * lista de pagos se podía pulsar tres veces seguidas y salían tres
   * escrituras, la última en el orden que quisiera la red (13/10/2026).
   */
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  nombreAccesible,
  error = false,
  disabled = false,
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
      disabled={disabled}
      aria-disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
      accessibilityRole="checkbox"
      /*
        Los dos: `accessibilityState` es lo que entiende React Native, y
        `aria-checked` lo que llega al DOM en web. Comprobado en el navegador:
        con solo `accessibilityState`, el elemento sale con `role="checkbox"` y
        `aria-label`, y **sin `aria-checked`** --react-native-web no lo
        traduce--, asi que un lector de pantalla dice "casilla" y no si esta
        marcada. Es la causa de R-13, que se habia anotado como un olvido.
      */
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      accessibilityLabel={nombreAccesible ?? label}
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
      {Boolean(label) && (
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
