import { theme } from "@/config";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { ScreenLayout } from "@/shared/layouts";
import { PRESENTACION_DE_ROL as PRESENTACION } from "@/shared/constants/presentacionDeRoles";

/*
  Sin cabecera encima, así que el borde de arriba lo pone la pantalla: sin él,
  el título quedaba bajo la muesca y la hora del teléfono (auditoría de
  responsividad, 24/10/2026). Donde sí hay cabecera no suma nada, porque solo
  aparta lo que de verdad pisa la zona insegura.
*/
const BORDES: ("top" | "left" | "right")[] = ["top", "left", "right"];

/**
 * Una misma persona puede ser administradora del edificio y propietaria de una
 * unidad a la vez. Cuando hay más de un rol posible, la app no puede elegir por
 * ella: se lo pregunta acá, después de iniciar sesión.
 */


export function SeleccionRolScreen() {
  const roles = useAuthStore((s) => s.rolesDisponibles);
  const setRolActivo = useAuthStore((s) => s.setRolActivo);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const usuario = useAuthStore((s) => s.usuario);

  return (
    <ScreenLayout edges={BORDES}>
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="gap-1 pt-2">
          <Text className="text-2xl font-bold text-gray-900">
            Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}
          </Text>
          <Text className="text-base text-gray-500">
            Tienes más de un rol en Veciyo. ¿Con cuál quieres entrar?
          </Text>
        </View>

        <View className="gap-3">
          {roles.map((rol) => {
            if (!rol) return null;
            const info = PRESENTACION[rol];
            return (
              <Pressable
                key={rol}
                onPress={() => setRolActivo(rol)}
                accessibilityRole="button"
                accessibilityLabel={info.titulo}
                className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.warningLight }}
                >
                  <Ionicons name={info.icono} size={22} color={theme.colors.iconAmberDark} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {info.titulo}
                  </Text>
                  <Text className="text-sm leading-5 text-gray-500">
                    {info.descripcion}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        {/*
          Con rol: sin el, el arbol de accesibilidad lo da como elemento
          generico --comprobado en el navegador-- y un lector de pantalla no
          lo anuncia como pulsable. Los dos de arriba si salen como boton.
        */}
        <Pressable
          onPress={cerrarSesion}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          className="items-center py-3"
        >
          <Text className="text-sm font-semibold text-gray-500 underline">
            Cerrar sesión
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenLayout>
  );
}
