import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PerfilScreen } from "@/features/perfil/screens/PerfilScreen";
import { SeguridadScreen } from "@/features/perfil/screens/SeguridadScreen";
import { SOSScreen } from "@/features/perfil/screens/SOSScreen";
import { SoporteScreen } from "@/features/perfil/screens/SoporteScreen";
import { PreguntasFrecuentesScreen } from "@/features/perfil/screens/PreguntasFrecuentesScreen";
import { ContactoSoporteScreen } from "@/features/perfil/screens/ContactoSoporteScreen";
import { PageHeader } from "@/shared/layouts";
import type { PerfilStackParamList } from "@/shared/types";
import { renderSharedScreens } from "../config/sharedScreens";

const Stack = createNativeStackNavigator<PerfilStackParamList>();

export function PerfilStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        headerTitleAlign: "center",
        header: (props) => <PageHeader {...props} />,
      }}
    >
      <Stack.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Seguridad"
        component={SeguridadScreen}
        options={{ title: "Seguridad" }}
      />
      <Stack.Screen
        name="SOS"
        component={SOSScreen}
        options={{ title: "S.O.S" }}
      />
      <Stack.Screen
        name="Soporte"
        component={SoporteScreen}
        options={{ title: "Soporte" }}
      />
      <Stack.Screen
        name="PreguntasFrecuentes"
        component={PreguntasFrecuentesScreen}
        options={{ title: "Preguntas frecuentes" }}
      />
      <Stack.Screen
        name="ContactoSoporte"
        component={ContactoSoporteScreen}
        options={{ title: "Contacto con VeciYo" }}
      />
      {renderSharedScreens(Stack)}
    </Stack.Navigator>
  );
}
