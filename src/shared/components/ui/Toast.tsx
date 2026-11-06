import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { View, Text, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "@/stores/ui-store";

/** Si el teclado está abierto ahora mismo. */
function useTecladoAbierto() {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const alAbrir = Keyboard.addListener("keyboardDidShow", () => setAbierto(true));
    const alCerrar = Keyboard.addListener("keyboardDidHide", () => setAbierto(false));
    return () => {
      alAbrir.remove();
      alCerrar.remove();
    };
  }, []);
  return abierto;
}

/**
 * Los avisos de abajo.
 *
 * Se monta dos veces a propósito: en la raíz de la aplicación y dentro del
 * velo de cada modal. Un modal se pinta en una capa aparte, por encima de
 * todo, así que el aviso de la raíz quedaba **detrás** de él: el cliente lo
 * vio el 12/10/2026, un error difuminado tras el modal que lo había causado.
 *
 * Con el teclado abierto van **arriba** (Correcciones, 06/11/2026): al entrar
 * con la contraseña mal, «Correo o contraseña incorrectos» salía debajo del
 * teclado y no se veía. Pasa igual en cualquier formulario.
 */
export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const tecladoAbierto = useTecladoAbierto();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      className={`absolute left-4 right-4 z-50 flex gap-2 ${tecladoAbierto ? "" : "bottom-24"}`}
      style={{
        pointerEvents: "none",
        ...(tecladoAbierto ? { top: insets.top + 12 } : null),
      }}
    >
      {toasts.map((toast) => (
        <View
          key={toast.id}
          className="flex-row items-center gap-2 rounded-xl px-4 py-3 shadow-md"
          style={{
            backgroundColor:
              toast.type === "error" ? theme.colors.danger : theme.colors.text,
          }}
        >
          <Text className="text-base">
            {toast.type === "error" ? "⚠️" : "✓"}
          </Text>
          <Text className="text-sm font-medium text-white flex-1">
            {toast.message}
          </Text>
        </View>
      ))}
    </View>
  );
}
