import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { theme } from "@/config";

interface ToggleProps {
  value: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  labelRight?: string;
  labelClassName?: string;
  labelRightClassName?: string;
  disabled?: boolean;
}

/**
 * Medidas del interruptor. Estan aqui y no repartidas por el archivo porque el
 * recorrido del pulgar se deduce de ellas: si alguien cambia el ancho y el
 * recorrido se queda escrito a mano, el pulgar se sale del carril.
 */
const CARRIL_ANCHO = 52;
const CARRIL_ALTO = 32;
const MARGEN = 3;
const PULGAR = CARRIL_ALTO - MARGEN * 2;
const RECORRIDO = CARRIL_ANCHO - PULGAR - MARGEN * 2;

/**
 * El carril cambia de color, no de golpe.
 *
 * El anterior movia el pulgar con una animacion y cambiaba el fondo con un
 * ternario, asi que el color saltaba mientras el pulgar todavia viajaba. Aqui
 * un solo valor animado gobierna las dos cosas, y el pulgar se encoge un poco
 * al pulsar para que el gesto se note antes de que el estado cambie.
 */
export function Toggle({
  value,
  onChange,
  label,
  labelRight,
  labelClassName = "",
  labelRightClassName = "",
  disabled = false,
}: ToggleProps) {
  const progreso = useSharedValue(value ? 1 : 0);
  const presion = useSharedValue(0);

  React.useEffect(() => {
    progreso.value = withTiming(value ? 1 : 0, {
      duration: 220,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    });
  }, [value]);

  const estiloCarril = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progreso.value,
      [0, 1],
      [theme.colors.switchOff, theme.colors.switchOn],
    ),
  }));

  const estiloPulgar = useAnimatedStyle(() => ({
    transform: [
      { translateX: MARGEN + progreso.value * RECORRIDO },
      { scale: 1 - presion.value * 0.12 },
    ],
  }));

  return (
    <View className="flex-row items-center gap-2.5">
      {label && (
        <Text className={`text-sm text-gray-500 ${labelClassName}`}>
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => onChange(!value)}
        onPressIn={() => {
          presion.value = withTiming(1, { duration: 90 });
        }}
        onPressOut={() => {
          presion.value = withTiming(0, { duration: 140 });
        }}
        disabled={disabled}
        accessibilityRole="switch"
        /*
          `aria-checked` ademas del estado de React Native, por lo mismo que
          ya se documento en `TiraDeDias`: react-native-web no traduce
          `accessibilityState` y el interruptor salia con `role="switch"` y sin
          estado. Es la causa de R-13 --tres interruptores que no decian si
          estaban puestos-- y estaba anotado como un olvido.
        */
        accessibilityState={{ checked: value, disabled }}
        aria-checked={value}
        accessibilityLabel={label ?? labelRight}
        hitSlop={8}
        style={{ opacity: disabled ? 0.45 : 1 }}
      >
        <Animated.View
          style={[
            estiloCarril,
            {
              width: CARRIL_ANCHO,
              height: CARRIL_ALTO,
              borderRadius: CARRIL_ALTO / 2,
              justifyContent: "center",
            },
          ]}
        >
          <Animated.View
            style={[
              estiloPulgar,
              {
                width: PULGAR,
                height: PULGAR,
                borderRadius: PULGAR / 2,
                backgroundColor: theme.colors.switchThumb,
                shadowColor: theme.colors.shadow,
                shadowOpacity: 0.2,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              },
            ]}
          />
        </Animated.View>
      </Pressable>
      {labelRight && (
        <Text className={`text-sm text-gray-500 ${labelRightClassName}`}>
          {labelRight}
        </Text>
      )}
    </View>
  );
}
