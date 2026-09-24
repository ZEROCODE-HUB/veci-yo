import React from "react";
import { Text, Pressable, Modal as RNModal } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { theme } from "@/config";
import { VeloModal } from "./VeloModal";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const HojaAnimada = Animated.createAnimatedComponent(Pressable);

/**
 * La hoja que sube desde abajo.
 *
 * Usaba `animationType="slide"` de React Native, que desliza **todo** el
 * contenedor: el velo oscuro entraba desde abajo junto con la hoja y se veía
 * su borde superior subir como una línea. Ahora el velo solo aparece --lo pone
 * [VeloModal]-- y lo único que se desplaza es la hoja.
 */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const progreso = useSharedValue(0);

  React.useEffect(() => {
    progreso.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 220 : 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible]);

  const estiloHoja = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ translateY: (1 - progreso.value) * 24 }],
  }));

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <VeloModal
        visible={visible}
        onPress={onClose}
        className="flex-1 justify-end"
      >
        {/* Por lo mismo que en `Modal`: envuelta en `Animated`, la hoja no
            recibe las clases de NativeWind y se quedaba sin fondo. */}
        <HojaAnimada
          onPress={(e) => e.stopPropagation()}
          style={[
            estiloHoja,
            {
              backgroundColor: theme.colors.bgCard,
              borderTopLeftRadius: theme.radius["2xl"],
              borderTopRightRadius: theme.radius["2xl"],
              overflow: "hidden",
              paddingBottom: 32,
              boxShadow: theme.shadows.modal,
            },
          ]}
        >
          {children}
        </HojaAnimada>
      </VeloModal>
    </RNModal>
  );
}

interface BottomSheetOptionProps {
  label: string;
  onPress: () => void;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}

export function BottomSheetOption({
  label,
  onPress,
  variant = "default",
  disabled = false,
}: BottomSheetOptionProps) {
  const colorPorVariante = {
    default: theme.colors.text,
    danger: theme.colors.danger,
    primary: theme.colors.primary,
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      className="w-full px-5 py-4 border-b border-gray-100"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        className="text-base font-medium text-center"
        style={{
          color: disabled ? theme.colors.textMuted : colorPorVariante[variant],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
