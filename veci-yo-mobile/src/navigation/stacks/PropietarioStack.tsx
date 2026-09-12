import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PropietarioStackParamList } from '@/shared/types';
import { PropietarioConfiguracionScreen } from '@/features/propietario/screens/PropietarioConfiguracionScreen';
import { PropietarioAceptacionScreen } from '@/features/propietario/screens/PropietarioAceptacionScreen';
import { PropietarioCrearRolScreen } from '@/features/propietario/screens/PropietarioCrearRolScreen';
import { PropietarioHistorialContratoScreen } from '@/features/propietario/screens/PropietarioHistorialContratoScreen';
import { PropietarioHuespedesTemporalesScreen } from '@/features/propietario/screens/PropietarioHuespedesTemporalesScreen';
import { PropietarioAgregarServicioScreen } from '@/features/propietario/screens/PropietarioAgregarServicioScreen';

const Stack = createNativeStackNavigator<PropietarioStackParamList>();

export function PropietarioStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="PropietarioConfiguracion"
        component={PropietarioConfiguracionScreen}
        options={{ title: 'Configuración' }}
      />
      <Stack.Screen
        name="Aceptar"
        component={PropietarioAceptacionScreen}
        options={{ title: 'Aceptar propiedad' }}
      />
      <Stack.Screen
        name="CrearRol"
        component={PropietarioCrearRolScreen}
        options={{ title: 'Gestión de usuarios' }}
      />
      <Stack.Screen
        name="HistorialContrato"
        component={PropietarioHistorialContratoScreen}
        options={{ title: 'Historial de Contrato' }}
      />
      <Stack.Screen
        name="HuespedesTemporales"
        component={PropietarioHuespedesTemporalesScreen}
        options={{ title: 'Conf. Huéspedes Temporales' }}
      />
      <Stack.Screen
        name="AgregarServicio"
        component={PropietarioAgregarServicioScreen}
        options={{ title: 'Agregar servicio' }}
      />
    </Stack.Navigator>
  );
}
