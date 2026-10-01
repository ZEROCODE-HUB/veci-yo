import { theme } from "@/config";
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal as RNModal,
} from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { VeloModal, useAnimacionContenido } from "./VeloModal";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
  headerAction?: React.ReactNode;
}

const TarjetaAnimada = Animated.createAnimatedComponent(Pressable);

/**
 * El modal centrado de la aplicación.
 *
 * La animación es propia (`animationType="none"`): la de React Native anima en
 * web el contenedor entero, y el fondo oscuro entraba deslizándose desde
 * abajo, con su borde recorriendo la pantalla como una línea. El fondo lo pone
 * [VeloModal], compartido con el resto de modales.
 *
 * La tarjeta **es** el elemento animado, no va envuelta en otro. Envolverla
 * rompía el `max-h-[85%]`: un porcentaje se mide contra la altura del padre, y
 * el envoltorio no tenía altura propia, así que la tarjeta crecía todo lo que
 * pidiera su contenido. En una ficha larga eso deja la cabecera --y con ella
 * la X de cerrar-- fuera de la pantalla, y el modal no se puede cerrar.
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  showClose = true,
  headerAction,
}: ModalProps) {
  const estiloTarjeta = useAnimacionContenido(visible);

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
        className="flex-1 items-center justify-center px-5"
      >
        {/*
            Las medidas y el fondo van en `style`, no en clases. Envolver esto
            en `Animated.createAnimatedComponent` deja fuera la traduccion de
            NativeWind: el `className` se pasa como un prop cualquiera y no lo
            lee nadie. El sintoma fue una tarjeta **transparente** --se veia la
            pagina difuminada a traves de ella-- porque el `bg-white` no
            llegaba a aplicarse.
        */}
        <TarjetaAnimada
          onPress={(e) => e.stopPropagation()}
          style={[
            estiloTarjeta,
            {
              width: "100%",
              maxWidth: 420,
              maxHeight: "85%",
              overflow: "hidden",
              backgroundColor: theme.colors.bgCard,
              borderRadius: theme.radius["2xl"],
              margin: 20,
              alignSelf: "center",
              shadowColor: theme.colors.shadow,
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            },
          ]}
        >
          {title && (
            <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
              {/*
                La cruz solo lleva icono: sin nombre, un lector de pantalla
                anuncia "boton" y ya. Esta en el Modal compartido, asi que la
                etiqueta vale para todos los modales de la aplicacion.
              */}
              {showClose ? (
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  className="mr-3 p-1"
                  hitSlop={8}
                >
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
        </TarjetaAnimada>
      </VeloModal>
    </RNModal>
  );
}
