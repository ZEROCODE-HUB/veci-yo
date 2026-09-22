import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/shared/services/supabase';
import { AuthStack } from './stacks/AuthStack';
import { AppTabs } from './AppTabs';
import type { RootStackParamList } from '@/shared/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const restaurando = useAuthStore((s) => s.restaurando);
  const modo = useAuthStore((s) => s.modo);

  useEffect(() => {
    // Al abrir la app, recupera la sesion guardada en SecureStore.
    void useAuthStore.getState().restaurarSesion();

    // Si el token se refresca o la sesion caduca en segundo plano, la app se
    // entera sin que el usuario tenga que hacer nada.
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      const estado = useAuthStore.getState();
      // Los modos demo e incognito no tienen sesion en Supabase: no deben
      // verse afectados por estos eventos.
      if (estado.modo === 'demo' || estado.modo === 'incognito') return;

      if (evento === 'SIGNED_OUT') {
        estado.cerrarSesion();
      } else if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        void estado.sincronizarContexto();
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (restaurando && modo === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#F5B800" />
      </View>
    );
  }

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
