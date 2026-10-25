import React, { useContext, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { QueryClientContext } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Lo que ocupa el botón flotante desde abajo: `CommsFab` está a 80 y mide 56,
 * más un margen. Sin este espacio al final del scroll, el botón tapaba lo
 * último de la lista --«Ver», el texto de Gratitud-- y no había forma de
 * subirlo (auditoría de responsividad, 25/10/2026).
 */
const ESPACIO_PARA_EL_FLOTANTE = 80 + 56 + 16;

interface ScreenLayoutProps {
  children: React.ReactNode;
  withScroll?: boolean;
  padding?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  floatingChild?: React.ReactNode;
}

export function ScreenLayout({
  children,
  withScroll = true,
  padding = true,
  edges = ["left", "right"],
  floatingChild,
}: ScreenLayoutProps) {
  // Sin proveedor (algunas pruebas montan la pantalla sola) no se ofrece.
  const cliente = useContext(QueryClientContext);
  const [refrescando, setRefrescando] = useState(false);
  /*
    Deslizar hacia abajo vuelve a leer lo que la pantalla tiene abierto: un
    cambio hecho en otro dispositivo tardaba en verse y no había cómo pedirlo
    (QA 23/10/2026).
  */
  const refrescar = async () => {
    if (!cliente) return;
    setRefrescando(true);
    try {
      await cliente.refetchQueries({ type: "active" });
    } finally {
      setRefrescando(false);
    }
  };

  const content = withScroll ? (
    <ScrollView
      className="flex-1 bg-bg-app"
      contentContainerStyle={{
        ...(padding ? { padding: 16 } : null),
        ...(floatingChild ? { paddingBottom: ESPACIO_PARA_EL_FLOTANTE } : null),
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        cliente ? (
          <RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className="flex-1 bg-bg-app"
      style={padding ? { padding: 16 } : undefined}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={edges}>
      {/*
        También en Android: la app se dibuja de borde a borde y el sistema ya
        no achica la ventana al abrir el teclado, así que tapaba el campo de
        la contraseña en el login sin dejar hacer scroll (QA 23/10/2026).
      */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "web" ? undefined : "padding"}
      >
        <View style={{ flex: 1 }}>
          {content}
          {floatingChild}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
