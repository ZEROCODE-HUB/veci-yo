import { theme } from "@/config";
import React from "react";
import { Text, useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TopBar } from "@/shared/layouts/TopBar";
import { HomeStack } from "./stacks/HomeStack";
import { ViviendaStack } from "./stacks/ViviendaStack";
import { PerfilStack } from "./stacks/PerfilStack";
import { useAuthStore } from "@/stores/auth-store";
import type { AppTabsParamList } from "@/shared/types";
import { AlarmaEnPorteria } from "@/features/perfil/components/sos/AlarmaEnPorteria";
import { Intercomunicador } from "@/features/intercom/components/Intercomunicador";
import { TOPE_DE_LETRA } from "@/app/topeDeLetra";

const Tab = createBottomTabNavigator<AppTabsParamList>();

/**
 * La etiqueta de cada pestaña, con el `Text` de la app y no el de la librería:
 * así lleva el tope de letra (`topeDeLetra.ts`), que la de React Navigation
 * no tiene, y no se parte en dos líneas.
 */
function EtiquetaDePestana({ color, texto }: { color: string; texto: string }) {
  return (
    <Text
      numberOfLines={1}
      style={{ color, fontSize: 11, fontWeight: "500", textAlign: "center" }}
    >
      {texto}
    </Text>
  );
}

export function AppTabs() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const esHuespedTemporal = rolActivo === "huesped-temporal";
  /*
    La porteria no tiene vivienda (R-2), asi que su pestaña del medio no abre
    `ViviendaResumen` sino `PorteriaResumen`: zonas comunes, estacionamientos
    de visita, directorio y, si se los habilitan, chat y llamadas. Antes del
    14/10/2026 no tenia esta pestaña; la pidio la responsable de producto.
  */
  const esGuardia = rolActivo === "guardia";
  const insets = useSafeAreaInsets();
  /*
    Con 65 fijos la etiqueta tenía 10 px y necesita 15: salía cortada por
    abajo en todos los teléfonos, no solo con la letra grande (auditoría de
    responsividad, 24/10/2026). Ahora 70, y crece con la letra del teléfono
    hasta el tope. Los iconos no crecen; solo la línea del texto.
  */
  const { fontScale } = useWindowDimensions();
  const crecimiento = Math.round((Math.min(Math.max(fontScale, 1), TOPE_DE_LETRA) - 1) * 20);

  // El S.O.S. llega en vivo a la portería y a la administración (14/10/2026).
  const atiendeSos = esGuardia || rolActivo === "administrador";

  return (
    <>
    {atiendeSos ? <AlarmaEnPorteria /> : null}
    {/* Las llamadas del intercomunicador, entrantes y en curso (14/10/2026). */}
    <Intercomunicador />
    <Tab.Navigator
      screenOptions={{
        header: ({ navigation }) => <TopBar navigation={navigation} />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          borderTopColor: theme.colors.borderLight,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 6,
          height: 70 + crecimiento + Math.max(0, insets.bottom - 10),
        },
      }}
    >
      {!esHuespedTemporal && (
        <Tab.Screen
          name="InicioTab"
          component={HomeStack}
          options={{
            tabBarLabel: ({ color }) => (
              <EtiquetaDePestana color={color} texto="Inicio" />
            ),
            tabBarAccessibilityLabel: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      {/*
        La porteria vuelve a tener la pestaña del medio desde el 14/10/2026,
        pero no es «mi vivienda»: es la de portería (zonas comunes,
        estacionamientos de visita, chat). Lo pidio la responsable de producto.
      */}
      <Tab.Screen
        name="ViviendaTab"
        component={ViviendaStack}
        options={{
          tabBarLabel: ({ color }) => (
            <EtiquetaDePestana color={color} texto={esGuardia ? "Portería" : "Viviendas"} />
          ),
          tabBarAccessibilityLabel: esGuardia ? "Portería" : "Viviendas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilStack}
        options={{
          tabBarLabel: ({ color }) => (
            <EtiquetaDePestana color={color} texto="Perfil" />
          ),
          tabBarAccessibilityLabel: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </>
  );
}
