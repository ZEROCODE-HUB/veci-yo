import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/features/onboarding/screens/LoginScreen';
import { RegistroScreen } from '@/features/onboarding/screens/RegistroScreen';
import { VerificacionScreen } from '@/features/onboarding/screens/VerificacionScreen';
import { DemoRoleScreen } from '@/features/onboarding/screens/DemoRoleScreen';
import { TerminosLegalesScreen } from '@/features/onboarding/screens/TerminosLegalesScreen';
import type { AuthStackParamList } from '@/shared/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registro" component={RegistroScreen} />
      <Stack.Screen name="Verificacion" component={VerificacionScreen} />
      <Stack.Screen name="DemoRole" component={DemoRoleScreen} />
      <Stack.Screen name="TerminosLegales" component={TerminosLegalesScreen} />
    </Stack.Navigator>
  );
}
