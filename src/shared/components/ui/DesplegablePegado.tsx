import { theme } from "@/config";
import React from "react";
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type View as ViewType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Dónde está el campo en la pantalla, medido al abrir. */
export interface Ancla {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Mide el campo en la pantalla y llama con su posición. */
export function medirAncla(campo: React.RefObject<ViewType | null>, alMedir: (ancla: Ancla | null) => void) {
  const nodo = campo.current;
  if (!nodo || typeof nodo.measureInWindow !== "function") {
    alMedir(null);
    return;
  }
  nodo.measureInWindow((x, y, ancho, alto) => {
    alMedir(ancho > 0 || alto > 0 ? { x, y, ancho, alto } : null);
  });
}

/** Lo mínimo que tiene que caber debajo para no abrir hacia arriba. */
const ALTO_MINIMO_DEBAJO = 200;
const MARGEN = 8;

/**
 * La lista de un desplegable, pegada al campo que la abre (25/11/2026, pedido
 * del cliente: «todos los dropdowns, que no salgan de abajo, sino del mismo
 * lugar de donde deben salir»). Debajo del campo si cabe; si no, encima. Nunca
 * se sale de la pantalla por los lados, y si el campo es estrecho la lista se
 * ensancha hasta `anchoMinimo` para que las opciones no se partan.
 *
 * El fondo es transparente --es un desplegable, no una ventana--: tocar fuera
 * lo cierra. La usan `Select`, `CampoHora` y el selector de país.
 */
export function DesplegablePegado({
  visible,
  ancla,
  onClose,
  children,
  altoMaximo = 320,
  anchoMinimo = 180,
}: {
  visible: boolean;
  ancla: Ancla | null;
  onClose: () => void;
  children: React.ReactNode;
  altoMaximo?: number;
  anchoMinimo?: number;
}) {
  const { width: anchoPantalla, height: altoPantalla } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!visible || !ancla) return null;

  const libreDebajo = altoPantalla - insets.bottom - (ancla.y + ancla.alto) - MARGEN;
  const libreEncima = ancla.y - insets.top - MARGEN;
  const haciaAbajo = libreDebajo >= ALTO_MINIMO_DEBAJO || libreDebajo >= libreEncima;
  const alto = Math.max(120, Math.min(altoMaximo, haciaAbajo ? libreDebajo : libreEncima));
  const ancho = Math.min(anchoPantalla - MARGEN * 2, Math.max(ancla.ancho, anchoMinimo));
  /*
    Si la lista es más ancha que el campo y el campo está a la derecha de la
    pantalla, se alinea con su borde derecho: así no se va a tapar el campo de
    al lado como si fuera suya.
  */
  const aLaDerecha = ancho > ancla.ancho && ancla.x + ancla.ancho / 2 > anchoPantalla / 2;
  const deseada = aLaDerecha ? ancla.x + ancla.ancho - ancho : ancla.x;
  const izquierda = Math.min(Math.max(MARGEN, deseada), anchoPantalla - MARGEN - ancho);

  return (
    <RNModal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar la lista"
      />
      <View
        className="absolute bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={[
          {
            left: izquierda,
            width: ancho,
            maxHeight: alto,
            boxShadow: theme.shadows.card,
          },
          haciaAbajo
            ? { top: ancla.y + ancla.alto + 4 }
            : { bottom: altoPantalla - ancla.y + 4 },
        ]}
      >
        {children}
      </View>
    </RNModal>
  );
}
