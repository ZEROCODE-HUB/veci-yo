import { theme } from "@/config";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ViviendaResumen } from "@/features/home/components/ViviendaResumen";
import { PorteriaResumen } from "@/features/home/components/PorteriaResumen";
import { useAuthStore } from "@/stores/auth-store";
import { CommsFab } from "@/features/home/components/CommsFab";
import { PageHeader, ScreenLayout } from "@/shared/layouts";
import type { ViviendaStackParamList } from "@/shared/types";
import { renderSharedScreens } from "../config/sharedScreens";

const Stack = createNativeStackNavigator<ViviendaStackParamList>();

function ViviendaScreen() {
  // La porteria no tiene vivienda: su pestaña del medio es la de portería.
  const esGuardia = useAuthStore((s) => s.rolActivo) === "guardia";
  return (
    <ScreenLayout padding={false} floatingChild={<CommsFab />}>
      {esGuardia ? <PorteriaResumen /> : <ViviendaResumen />}
    </ScreenLayout>
  );
}

export function ViviendaStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.bgCard },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: "700" },
        headerTitleAlign: "center",
        header: (props) => <PageHeader {...props} />,
      }}
    >
      <Stack.Screen
        name="Vivienda"
        component={ViviendaScreen}
        options={{ headerShown: false }}
      />
      {renderSharedScreens(Stack)}
    </Stack.Navigator>
  );
}
