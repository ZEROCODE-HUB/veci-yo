import React, { useContext, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { QueryClientContext } from "@tanstack/react-query";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

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
    La app se dibuja de borde a borde, así que sin el margen de abajo lo
    último del scroll --el «Registrarse»-- quedaba bajo los botones de
    Android (QA 29/10/2026). Dentro de las pestañas ese margen ya lo pone la
    barra, y fuera de ellas lo pone el `edges` de quien pida "bottom".
  */
  const margenes = useSafeAreaInsets();
  const enPestanas = useContext(BottomTabBarHeightContext) !== undefined;
  const margenAbajo =
    enPestanas || edges.includes("bottom") ? 0 : margenes.bottom;
  const rellenoAbajo =
    (floatingChild ? ESPACIO_PARA_EL_FLOTANTE : padding ? 16 : 0) + margenAbajo;
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
        paddingBottom: rellenoAbajo,
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
      style={{ ...(padding ? { padding: 16 } : null), paddingBottom: (padding ? 16 : 0) + margenAbajo }}
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
