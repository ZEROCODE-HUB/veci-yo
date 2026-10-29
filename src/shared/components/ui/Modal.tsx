import { theme } from "@/config";
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VeloModal, useAnimacionContenido } from "./VeloModal";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showClose?: boolean;
  headerAction?: React.ReactNode;
}

// Una vista y no un pulsable: el fondo que cierra ya no la envuelve
// (`VeloModal`), y un pulsable alrededor de la lista le quitaba el deslizar en
// Android (29/10/2026).
const TarjetaAnimada = Animated.View;

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
 *
 * Con el teclado abierto la tarjeta sube y se encoge al hueco que queda
 * encima, y lo de dentro se desplaza: si no, el teclado tapaba los campos y el
 * botón de abajo (auditoría de responsividad, 24/10/2026).
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
  // La ventana del modal pasa por debajo de las barras del sistema
  // (`statusBarTranslucent`): la tarjeta no puede meterse bajo ellas.
  const bordes = useSafeAreaInsets();

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
          El modal se abre en una ventana propia, así que el
          `KeyboardAvoidingView` de `ScreenLayout` no llega hasta aquí. Va
          dentro del velo: un toque fuera de la tarjeta sigue llegando a él,
          que es quien cierra. Solo resta lo que el teclado tape de verdad, así
          que no deja doble hueco donde el sistema ya achique la ventana.
        */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "web" ? undefined : "padding"}
          // Que el hueco alrededor de la tarjeta deje pasar el toque al fondo, que cierra.
          pointerEvents="box-none"
          style={{
            flex: 1,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: bordes.top,
            paddingBottom: bordes.bottom,
          }}
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
            style={[
              estiloTarjeta,
              {
                width: "100%",
                maxWidth: 420,
                maxHeight: "85%",
                // Con el teclado abierto, se encoge al hueco que queda.
                flexShrink: 1,
                overflow: "hidden",
                backgroundColor: theme.colors.bgCard,
                borderRadius: theme.radius["2xl"],
                // Solo arriba y abajo: a los lados ya separa el `px-5` del
                // velo, y los dos juntos dejaban la tarjeta en 240 de ancho en
                // un teléfono de 320.
                marginVertical: 20,
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
                {/*
                  El hueco de la derecha va siempre, para que el título quede en
                  el centro. Sin la cruz faltaba, y el título se corría a la
                  derecha (el del intercomunicador, Para Claude, 21/10/2026).
                */}
                {headerAction ? (
                  <View className="ml-3">{headerAction}</View>
                ) : (
                  <View className="w-8 ml-3" />
                )}
              </View>
            )}
            {/*
              `flexShrink: 1`: en el teléfono un hijo no se encoge si no se le
              dice (en la web sí, por eso allí se veía bien). Sin esto, con un
              formulario largo la lista medía lo que su contenido, la tarjeta la
              recortaba al 85 % y no había scroll: el botón de abajo salía
              partido por la mitad (coadministradores, QA 23/10/2026).

              El relleno va en el contenido, no en el `ScrollView`: en el
              teléfono el relleno del propio `ScrollView` no entra en lo que se
              puede desplazar, así que lo último quedaba cortado aunque se
              bajara del todo. En la web sí entraba (el «Cancelar» del reporte
              al ministerio, Para Claude 118, 27/10/2026).
            */}
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 28 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {children}
            </ScrollView>
          </TarjetaAnimada>
        </KeyboardAvoidingView>
      </VeloModal>
    </RNModal>
  );
}
