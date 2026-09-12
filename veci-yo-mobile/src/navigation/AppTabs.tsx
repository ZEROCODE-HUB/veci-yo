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

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabs() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const esHuespedTemporal = rolActivo === "huesped-temporal";
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        header: ({ navigation }) => <TopBar navigation={navigation} />,
        tabBarActiveTintColor: "#F5B800",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          borderTopColor: "#F3F4F6",
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
      <Tab.Screen
        name="ViviendaTab"
        component={ViviendaStack}
        options={{
          tabBarLabel: "Viviendas",
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
  );
}
