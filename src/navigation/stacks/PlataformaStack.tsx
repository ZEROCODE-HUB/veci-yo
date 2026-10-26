import React from "react";
import { Pressable, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/config";
import { useAuthStore } from "@/stores/auth-store";
import { PlataformaResumenScreen } from "@/features/plataforma/screens/PlataformaResumenScreen";
import { PlataformaEdificioNuevoScreen } from "@/features/plataforma/screens/PlataformaEdificioNuevoScreen";
import { PlataformaSoporteScreen } from "@/features/plataforma/screens/PlataformaSoporteScreen";
import { PlataformaDescuentosScreen } from "@/features/plataforma/screens/PlataformaDescuentosScreen";
import { PlataformaSoporteDetalleScreen } from "@/features/plataforma/screens/PlataformaSoporteDetalleScreen";
import { PlataformaEquipoScreen } from "@/features/plataforma/screens/PlataformaEquipoScreen";
import { PlataformaBitacoraScreen } from "@/features/plataforma/screens/PlataformaBitacoraScreen";
import { PlataformaUsuariosScreen } from "@/features/plataforma/screens/PlataformaUsuariosScreen";
import { PlataformaAjustesScreen } from "@/features/plataforma/screens/PlataformaAjustesScreen";
import { PlataformaMasScreen } from "@/features/plataforma/screens/PlataformaMasScreen";
import { PlataformaPreciosScreen } from "@/features/plataforma/screens/PlataformaPreciosScreen";
import { PlataformaTextosLegalesScreen } from "@/features/plataforma/screens/PlataformaTextosLegalesScreen";
import { PlataformaPaisesScreen } from "@/features/plataforma/screens/PlataformaPaisesScreen";
import { PlataformaPermisosScreen } from "@/features/plataforma/screens/PlataformaPermisosScreen";
import { PlataformaPaisScreen } from "@/features/plataforma/screens/PlataformaPaisScreen";
import type { PlataformaStackParamList } from "@/shared/types/navigation";

/**
 * La navegación de quien opera la plataforma.
 *
 * **No reutiliza `AppTabs` ni `TopBar` a propósito.** La barra de arriba de la
 * aplicación habla de viviendas —elige la vivienda activa, ofrece «Administrar
 * mis ubicaciones»— y este rol no tiene ninguna. Ya pasó una vez con la
 * portería: la barra le ofrecía una pantalla de residentes sobre viviendas que
 * no eran suyas.
 *
 * Así que esto es su propio árbol, y lo único que comparte con el resto es
 * cerrar sesión. Separado también por lo otro: una pestaña de un edificio aquí
 * no es un defecto visual, es el límite de este rol roto.
 */

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<PlataformaStackParamList>();

/** La barra de arriba del panel: dice quién eres y deja salir. */
function BarraDelPanel() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const rolPlataforma = useAuthStore((s) => s.rolPlataforma);
  const rolesDisponibles = useAuthStore((s) => s.rolesDisponibles);
  const setRolActivo = useAuthStore((s) => s.setRolActivo);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);

  /*
    Quien además vive en un edificio tiene los dos roles y puede volver. Quien
    solo opera la plataforma no tiene a dónde ir, así que ese botón no se pinta:
    lo llevaría a una vista de residente sin vivienda.
  */
  const puedeVolverAlEdificio = rolesDisponibles.length > 1;

  return (
    <View
      className="bg-white px-4 pb-3 shadow-card"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            Panel de Veciyo
          </Text>
          <Text className="text-xs text-gray-500">
            {[usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ")}
            {rolPlataforma === "dueno" ? " · dueño" : " · soporte"}
          </Text>
        </View>

        {puedeVolverAlEdificio ? (
          <Pressable
            onPress={() => setRolActivo(null)}
            accessibilityRole="button"
            accessibilityLabel="Cambiar de rol"
            className="mr-3 p-2 active:opacity-70"
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={cerrarSesion}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          className="p-2 active:opacity-70"
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

/** La portada, con el alta de edificio colgando de ella. */
function EdificiosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlataformaResumen" component={PlataformaResumenScreen} />
      <Stack.Screen
        name="PlataformaEdificioNuevo"
        component={PlataformaEdificioNuevoScreen}
      />
    </Stack.Navigator>
  );
}

/** Las PQRS de la aplicación, con su detalle. */
function SoporteStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlataformaSoporte" component={PlataformaSoporteScreen} />
      <Stack.Screen
        name="PlataformaSoporteDetalle"
        component={PlataformaSoporteDetalleScreen}
      />
    </Stack.Navigator>
  );
}

/*
  «Más»: lo que se usa menos (23/10/2026). Las de dentro llevan la cabecera de
  la pila, que trae la flecha para volver.
*/
function MasStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PlataformaMas" component={PlataformaMasScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlataformaPrecios" component={PlataformaPreciosScreen} options={{ title: "Planes y precios" }} />
      <Stack.Screen name="PlataformaDescuentos" component={PlataformaDescuentosScreen} options={{ title: "Descuentos" }} />
      {/* Los países y los documentos que se piden en cada uno (25/10/2026). */}
      <Stack.Screen name="PlataformaPaises" component={PlataformaPaisesScreen} options={{ title: "Países" }} />
      <Stack.Screen name="PlataformaPermisos" component={PlataformaPermisosScreen} options={{ title: "Permisos por rol" }} />
      <Stack.Screen name="PlataformaPais" component={PlataformaPaisScreen} options={{ title: "País" }} />
      <Stack.Screen
        name="PlataformaTextosLegales"
        component={PlataformaTextosLegalesScreen}
        options={{ title: "Textos legales" }}
      />
      <Stack.Screen name="PlataformaEquipo" component={PlataformaEquipoScreen} options={{ title: "Equipo" }} />
      <Stack.Screen name="PlataformaBitacora" component={PlataformaBitacoraScreen} options={{ title: "Bitácora" }} />
    </Stack.Navigator>
  );
}

export function PlataformaStack() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <BarraDelPanel />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          borderTopColor: theme.colors.borderLight,
          paddingBottom: Math.max(10, insets.bottom),
          paddingTop: 6,
          height: 65 + Math.max(0, insets.bottom - 10),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tab.Screen
        name="EdificiosTab"
        component={EdificiosStack}
        options={{
          tabBarLabel: "Edificios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Buscar una cuenta y actuar sobre ella (23/10/2026). */}
      <Tab.Screen
        name="UsuariosTab"
        component={PlataformaUsuariosScreen}
        options={{
          tabBarLabel: "Usuarios",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Los parámetros de la app, que antes solo se cambiaban en Supabase. */}
      <Tab.Screen
        name="AjustesTab"
        component={PlataformaAjustesScreen}
        options={{
          tabBarLabel: "Ajustes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="options-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SoporteTab"
        component={SoporteStack}
        options={{
          tabBarLabel: "Soporte",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbox-ellipses-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/*
        Planes, descuentos, textos legales, equipo y bitácora. El equipo lo ve
        también soporte --para saber a quién escribirle--; cambiarlo, y todo lo
        demás que escribe, es solo del dueño, y eso lo decide cada pantalla.
      */}
      <Tab.Screen
        name="MasTab"
        component={MasStack}
        options={{
          tabBarLabel: "Más",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
