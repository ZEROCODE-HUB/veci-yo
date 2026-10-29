import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/auth-store';
import { useDatosCondominio } from "@/features/administrador/hooks/useDatosCondominio";
import { useContextoEnVivo } from "@/app/useContextoEnVivo";
import { supabase } from '@/shared/services/supabase';
import { tomarMotivoDeSalida } from '@/shared/services/sesionViva';
import { useUIStore } from '@/stores/ui-store';
import { SeleccionRolScreen } from '@/features/onboarding/screens/SeleccionRolScreen';
import { AceptarInvitacionScreen } from '@/features/onboarding/screens/AceptarInvitacionScreen';
import { CuentaSuspendidaScreen } from '@/features/onboarding/screens/CuentaSuspendidaScreen';
import { AuthStack } from './stacks/AuthStack';
import { AppTabs } from './AppTabs';
import { PlataformaStack } from './stacks/PlataformaStack';
import type { RootStackParamList } from '@/shared/types';
import { Cargando } from '@/shared/components';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Deep linking. El correo de invitacion manda a `/invitacion?token=...`, y ese
 * enlace tiene que abrir la pantalla correcta tanto en la app instalada como en
 * la version web. Sin esto el enlace no lleva a ningun lado.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'https://veciyo-web-seven.vercel.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Registro: 'registro',
        },
      },
      // Fuera de Auth y de App: el enlace del correo tiene que funcionar tanto
      // antes como despues de iniciar sesion. Si viviera dentro de Auth, el
      // usuario que se loguea para aceptar ya no podria volver a la pantalla.
      AceptarInvitacion: 'invitacion',
      SeleccionRol: 'seleccionar-rol',
      App: '*',
    },
  },
};

export function RootNavigator() {
  const autenticado = useAuthStore((s) => s.autenticado);
  const restaurando = useAuthStore((s) => s.restaurando);
  const modo = useAuthStore((s) => s.modo);
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const rolesDisponibles = useAuthStore((s) => s.rolesDisponibles);
  const suspension = useAuthStore((s) => s.suspension);

  // Trae del condominio real las torres, unidades, depositos, porterias,
  // tipologias y guardias que media docena de pantallas leen del store de
  // administracion. Se monta aqui y no en cada una de ellas.
  useDatosCondominio();
  // Un edificio o una vivienda que le asignan aparece sin cerrar la app.
  useContextoEnVivo();

  // Con cuenta real y varios roles posibles, la app no puede elegir por el
  // usuario: le pregunta antes de entrar. Demo e incognito ya traen su rol.
  const debeElegirRol =
    autenticado && modo === 'cuenta' && rolActivo === null && rolesDisponibles.length > 1;

  const queryClient = useQueryClient();
  const usuarioAnterior = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Al abrir la app, recupera la sesion guardada en SecureStore.
    void useAuthStore.getState().restaurarSesion();

    // Si el token se refresca o la sesion caduca en segundo plano, la app se
    // entera sin que el usuario tenga que hacer nada.
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      /*
        Lo que se leyó con otra sesión no vale para esta (15/10/2026). La
        memoria de consultas no se vaciaba nunca: lo pedido en la pantalla de
        entrada --sin sesión, cero viviendas-- se reutilizaba cinco minutos, y
        la portería abría «¿Para qué departamento?» sin opciones. Y al revés,
        quien entraba después de otra persona en el mismo navegador podía ver
        un rato lo de la anterior. Se vacía cuando cambia **quién**, no en cada
        renovación del token.
      */
      const usuario = sesion?.user?.id ?? null;
      if (usuarioAnterior.current !== undefined && usuarioAnterior.current !== usuario) {
        queryClient.clear();
      }
      usuarioAnterior.current = usuario;

      const estado = useAuthStore.getState();
      if (evento === 'SIGNED_OUT') {
        // `limpiarSesion` y no `cerrarSesion`: esta ultima vuelve a llamar a
        // `signOut`, que dispara este mismo evento otra vez.
        estado.limpiarSesion();
        // Si la sacamos nosotros por una sesión muerta, se le dice por qué.
        const motivo = tomarMotivoDeSalida();
        if (motivo) useUIStore.getState().addToast(motivo, "info");
      } else if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        void estado.sincronizarContexto();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  if (restaurando && modo === null) {
    return (
      <View className="flex-1 bg-white">
        <Cargando />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Suspendida desde el panel: antes que nada, su pantalla (24/10/2026). */}
        {suspension ? (
          <Stack.Screen name="CuentaSuspendida" component={CuentaSuspendidaScreen} />
        ) : !autenticado ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : debeElegirRol ? (
          <Stack.Screen name="SeleccionRol" component={SeleccionRolScreen} />
        ) : rolActivo === 'plataforma' ? (
          /*
            Quien opera la plataforma no entra en `AppTabs`: no tiene vivienda
            ni condominio, asi que la barra de arriba --que elige la vivienda
            activa-- y las pestañas del edificio no le sirven y, peor, le
            ofrecerian lo que su rol no puede ver. Su arbol es aparte.
          */
          <Stack.Screen name="Plataforma" component={PlataformaStack} />
        ) : (
          <Stack.Screen name="App" component={AppTabs} />
        )}
        <Stack.Screen
          name="AceptarInvitacion"
          component={AceptarInvitacionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
