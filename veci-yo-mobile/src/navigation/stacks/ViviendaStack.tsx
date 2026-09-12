import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ViviendaResumen } from "@/features/home/components/ViviendaResumen";
import { CommsFab } from "@/features/home/components/CommsFab";
import { PageHeader, ScreenLayout } from "@/shared/layouts";
import type { ViviendaStackParamList } from "@/shared/types";
import { renderSharedScreens } from "../config/sharedScreens";

const Stack = createNativeStackNavigator<ViviendaStackParamList>();

function ViviendaScreen() {
  return (
    <ScreenLayout
      padding={false}
      withToast={false}
      floatingChild={<CommsFab />}
    >
      <ViviendaResumen />
    </ScreenLayout>
  );
}

export function ViviendaStack() {
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
        name="Vivienda"
        component={ViviendaScreen}
        options={{ headerShown: false }}
      />
      {renderSharedScreens(Stack)}
    </Stack.Navigator>
  );
}
