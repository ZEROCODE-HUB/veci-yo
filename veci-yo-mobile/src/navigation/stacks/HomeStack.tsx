import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { VerificacionScreen } from "@/features/onboarding/screens/VerificacionScreen";
import { PageHeader } from "@/shared/layouts";
import type { HomeStackParamList } from "@/shared/types";
import { renderSharedScreens } from "../config/sharedScreens";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        headerTitleAlign: "center",
        header: (props) => <PageHeader {...props} />,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Verificacion"
        component={VerificacionScreen}
        options={{ headerShown: false }}
      />
      {renderSharedScreens(Stack)}
    </Stack.Navigator>
  );
}
