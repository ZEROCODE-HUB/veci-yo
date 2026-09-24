import { theme } from "@/config";
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal as RNModal,
  Platform,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
  headerAction?: React.ReactNode;
}

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

/**
 * El fondo se desenfoca y aparece; no entra deslizándose.
 *
 * Usaba `animationType="fade"` de React Native, que en web anima el contenedor
 * entero: el fondo oscuro subía desde abajo y se veía su borde recorrer la
 * pantalla como una línea. Aquí la animación es propia —`animationType="none"`
 * y dos valores animados— así que el velo solo cambia de opacidad y el
 * contenido acompaña con una escala corta.
 *
 * El desenfoque es de `expo-blur`, que en web se apoya en `backdrop-filter` y
 * en el teléfono en el desenfoque del sistema. En web la intensidad se
 * traduce a píxeles multiplicando por 0,2 --55 son 11px--, así que el número
 * no significa lo mismo en las dos plataformas y se ajusta por separado.
 *
 * Debajo queda siempre un velo oscuro: si el desenfoque no está disponible,
 * la tarjeta sigue separándose del fondo en vez de quedar flotando sobre el
 * contenido a plena luz.
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  showClose = true,
  headerAction,
}: ModalProps) {
  const progreso = useSharedValue(0);

  React.useEffect(() => {
    progreso.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 180 : 120,
      easing: Easing.out(Easing.quad),
    });
  }, [visible]);

  const estiloVelo = useAnimatedStyle(() => ({
    opacity: progreso.value,
  }));

  const estiloTarjeta = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ scale: 0.96 + progreso.value * 0.04 }],
  }));

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <AnimatedBlur
        intensity={Platform.OS === "web" ? 55 : 40}
        tint="dark"
        style={[StyleSheet.absoluteFill, estiloVelo]}
      >
        <Pressable
          onPress={onClose}
          className="flex-1 items-center justify-center px-5"
          style={{ backgroundColor: theme.colors.bgOverlayDifuminado }}
        >
          <Animated.View
            style={[estiloTarjeta, { width: "100%", alignItems: "center" }]}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-[420px] max-h-[85%] overflow-hidden"
              style={{
                margin: 20,
                alignSelf: "center",
                shadowColor: theme.colors.shadow,
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              {title && (
                <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
                  {showClose ? (
                    <Pressable onPress={onClose} className="mr-3 p-1">
                      <Ionicons
                        name="close"
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </Pressable>
                  ) : (
                    <View className="w-8 mr-3" />
                  )}
                  <Text className="flex-1 text-lg font-bold text-gray-900 text-center">
                    {title}
                  </Text>
                  {headerAction ? (
                    <View className="ml-3">{headerAction}</View>
                  ) : showClose ? (
                    <View className="w-8 ml-3" />
                  ) : null}
                </View>
              )}
              <ScrollView
                className="p-5"
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {children}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </AnimatedBlur>
    </RNModal>
  );
}
