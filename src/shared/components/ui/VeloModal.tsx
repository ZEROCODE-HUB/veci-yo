import { theme } from "@/config";
import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

interface VeloModalProps {
  visible: boolean;
  onPress: () => void;
  /** Cómo se coloca el contenido dentro del velo: centrado, abajo o libre. */
  className?: string;
  children: React.ReactNode;
}

const BlurAnimado = Animated.createAnimatedComponent(BlurView);

/**
 * El fondo oscuro y difuminado que llevan todos los modales.
 *
 * Existe porque "todos los modales" eran cuatro implementaciones distintas
 * --`Modal`, `BottomSheet`, `Select` y el desplegable de `TopBar`--, cada una
 * con su propio `rgba(0,0,0,0.5)` escrito a mano y su propia animación. Dos de
 * ellas usaban `animationType="slide"`: el velo entraba deslizándose desde
 * abajo y se veía su borde superior recorrer la pantalla como una línea
 * oscura. Arreglar solo una dejaba las otras tres igual, y eso fue justo lo
 * que pasó.
 *
 * Aquí el velo solo cambia de opacidad --la posición no se anima, así que no
 * hay borde que viaje-- y el desenfoque es de `expo-blur`. Cada modal sigue
 * decidiendo dónde va su contenido con `className`; lo único compartido es el
 * fondo.
 *
 * En web la intensidad se traduce a píxeles multiplicando por 0,2 (55 son
 * 11px), así que el número no significa lo mismo en las dos plataformas.
 */
export function VeloModal({
  visible,
  onPress,
  className = "flex-1",
  children,
}: VeloModalProps) {
  const progreso = useSharedValue(0);

  React.useEffect(() => {
    progreso.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 180 : 120,
      easing: Easing.out(Easing.quad),
    });
  }, [visible, progreso]);

  const estiloVelo = useAnimatedStyle(() => ({ opacity: progreso.value }));

  return (
    <BlurAnimado
      intensity={Platform.OS === "web" ? 55 : 40}
      tint="dark"
      style={[StyleSheet.absoluteFill, estiloVelo]}
    >
      <Pressable
        onPress={onPress}
        className={className}
        style={{ backgroundColor: theme.colors.bgOverlayDifuminado }}
      >
        {children}
      </Pressable>
    </BlurAnimado>
  );
}

/**
 * La animación de entrada del contenido: aparece y crece un poco.
 *
 * Se expone aparte del velo porque no todos la quieren igual --una hoja que
 * sube desde abajo no debe escalar-- y porque el contenido de cada modal tiene
 * su propio tamaño.
 */
export function useAnimacionContenido(visible: boolean) {
  const progreso = useSharedValue(0);

  React.useEffect(() => {
    progreso.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 180 : 120,
      easing: Easing.out(Easing.quad),
    });
  }, [visible, progreso]);

  return useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ scale: 0.96 + progreso.value * 0.04 }],
  }));
}
