import { theme } from "@/config";
import React from "react";
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

const Tab = createBottomTabNavigator<AppTabsParamList>();

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

  // El S.O.S. llega en vivo a la portería y a la administración (14/10/2026).
  const atiendeSos = esGuardia || rolActivo === "administrador";

  return (
    <>
    {atiendeSos ? <AlarmaEnPorteria /> : null}
    <Tab.Navigator
      screenOptions={{
        header: ({ navigation }) => <TopBar navigation={navigation} />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          borderTopColor: theme.colors.borderLight,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 6,
          height: 65 + Math.max(0, insets.bottom - 10),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      {!esHuespedTemporal && (
        <Tab.Screen
          name="InicioTab"
          component={HomeStack}
          options={{
            tabBarLabel: "Inicio",
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
          tabBarLabel: esGuardia ? "Portería" : "Viviendas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilStack}
        options={{
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </>
  );
}
