import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/auth-store';
import { AuthStack } from './stacks/AuthStack';
import { AppTabs } from './AppTabs';
import type { RootStackParamList } from '@/shared/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const autenticado = useAuthStore((s) => s.autenticado);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {autenticado ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
