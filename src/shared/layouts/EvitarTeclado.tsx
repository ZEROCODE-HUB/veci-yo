import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  View,
  type KeyboardEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
  /** Solo Android: lo que hay encima de la caja (la cabecera). En iPhone se mide. */
  keyboardVerticalOffset?: number;
  /**
   * En Android, medir dónde está el teclado como en el iPhone, en vez de
   * `KeyboardAvoidingView` (13/11/2026). En el chat el teclado seguía tapando
   * la caja de escribir: entre la barra de la app, la cabecera y el aviso de
   * arriba, el desplazamiento fijo se quedaba corto.
   */
  medirEnAndroid?: boolean;
};

/**
 * Deja sitio al teclado debajo de lo que envuelve.
 *
 * En el iPhone (09/11/2026, el cliente: «el teclado tapa el input, sobre todo
 * en chats»), `KeyboardAvoidingView` calcula el hueco con su posición
 * **dentro de su padre**, no en la pantalla. Debajo de una cabecera se quedaba
 * corto justo el alto de esa cabecera (y de la barra de estado), así que la
 * caja de escribir quedaba detrás del teclado. Para corregirlo había que pasar
 * `keyboardVerticalOffset` a mano en cada pantalla, y casi ninguna lo hacía.
 *
 * Aquí, en el iPhone, se mide la caja **en la ventana** (`measureInWindow`)
 * y se compara con dónde empieza el teclado: el hueco es exactamente lo que el
 * teclado tapa, haya cabecera, pestañas o un modal encima.
 *
 * En Android y en la web se queda el `KeyboardAvoidingView` de siempre, que
 * ahí ya funciona y está comprobado en el celular del cliente.
 */
export function EvitarTeclado({
  children,
  style,
  className,
  pointerEvents,
  keyboardVerticalOffset,
  medirEnAndroid,
}: Props) {
  if (Platform.OS !== "ios" && !(medirEnAndroid && Platform.OS === "android")) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "web" ? undefined : "padding"}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={style}
        className={className}
        pointerEvents={pointerEvents}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }
  return (
    <HuecoDelTecladoIos style={style} className={className} pointerEvents={pointerEvents}>
      {children}
    </HuecoDelTecladoIos>
  );
}

function HuecoDelTecladoIos({ children, style, className, pointerEvents }: Props) {
  const caja = useRef<View>(null);
  const [hueco, setHueco] = useState(0);

  useEffect(() => {
    const animar = (e: KeyboardEvent) => {
      if (e.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { type: LayoutAnimation.Types.keyboard },
        });
      }
    };
    const alMoverse = (e: KeyboardEvent) => {
      const arribaDelTeclado = e.endCoordinates.screenY;
      caja.current?.measureInWindow((_x, y, _ancho, alto) => {
        // El relleno va por dentro, así que el alto medido no cambia con él.
        const tapado = Math.max(0, Math.round(y + alto - arribaDelTeclado));
        animar(e);
        setHueco(tapado);
      });
    };
    const alCerrarse = (e: KeyboardEvent) => {
      animar(e);
      setHueco(0);
    };
    const subs = [
      // Android no avisa antes: solo cuando ya salió o ya se fue.
      ...(Platform.OS === "android"
        ? [
            Keyboard.addListener("keyboardDidShow", alMoverse),
            Keyboard.addListener("keyboardDidHide", alCerrarse),
          ]
        : [
            Keyboard.addListener("keyboardWillShow", alMoverse),
            Keyboard.addListener("keyboardWillChangeFrame", alMoverse),
            Keyboard.addListener("keyboardWillHide", alCerrarse),
          ]),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  return (
    <View
      ref={caja}
      // Sin teclado se respeta el relleno que traiga quien lo monta.
      style={hueco > 0 ? [style, { paddingBottom: hueco }] : style}
      className={className}
      pointerEvents={pointerEvents}
    >
      {children}
    </View>
  );
}
