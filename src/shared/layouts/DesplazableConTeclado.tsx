import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from "react-native";

/**
 * Un `ScrollView` que deja sitio al teclado. Para las pantallas que no usan
 * `ScreenLayout` --que ya lo hace-- y tienen campos de texto.
 *
 * La app se dibuja de borde a borde, así que Android ya no achica la ventana
 * al abrir el teclado: tapaba los campos de abajo y no se podía bajar hasta
 * ellos (auditoría de responsividad, 24/10/2026). Recibe lo mismo que un
 * `ScrollView`, clases incluidas.
 */
export function DesplazableConTeclado({ children, ...props }: ScrollViewProps & { className?: string; contentContainerClassName?: string }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "web" ? undefined : "padding"}
    >
      <ScrollView keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
