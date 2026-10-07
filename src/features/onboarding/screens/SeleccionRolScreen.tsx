import { theme } from "@/config";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { ScreenLayout } from "@/shared/layouts";
import type { RolActivo } from "@/shared/types";

/**
 * Una misma persona puede ser administradora del edificio y propietaria de una
 * unidad a la vez. Cuando hay más de un rol posible, la app no puede elegir por
 * ella: se lo pregunta acá, después de iniciar sesión.
 */

const PRESENTACION: Record<
  NonNullable<RolActivo>,
  { titulo: string; descripcion: string; icono: keyof typeof Ionicons.glyphMap }
> = {
  administrador: {
    titulo: "Administrador",
    descripcion: "Gestionar torres, unidades, zonas comunes y seguridad",
    icono: "business-outline",
  },
  guardia: {
    titulo: "Seguridad",
    descripcion: "Registrar visitas, correspondencia e ingresos",
    icono: "shield-checkmark-outline",
  },
  propietario: {
    titulo: "Propietario",
    descripcion: "Administrar tu vivienda y las personas que la habitan",
    icono: "home-outline",
  },
  "propietario-no-residente": {
    titulo: "Propietario no residente",
    descripcion: "Administrar tu vivienda sin vivir en ella",
    icono: "home-outline",
  },
  "propietario-sin-propiedades": {
    titulo: "Propietario",
    descripcion: "Todavía no tenés ninguna vivienda asignada",
    icono: "home-outline",
  },
  "inquilino-lider": {
    titulo: "Residente",
    descripcion: "Gestionar el día a día de tu vivienda",
    icono: "key-outline",
  },
  "huesped-temporal": {
    titulo: "Huésped temporal",
    descripcion: "Ver tu alojamiento durante tu estadía",
    icono: "bag-outline",
  },
  /*
    Operar la plataforma es un rol como los demás y se elige igual: quien además
    vive en un edificio tiene los dos y cambia cuando quiere. No es un permiso
    que se sume a otro, que es justo el error de la regla 8.
  */
  plataforma: {
    titulo: "Plataforma Veciyo",
    descripcion: "Dar de alta edificios y atender el soporte de la aplicación",
    icono: "globe-outline",
  },
};

export function SeleccionRolScreen() {
  const roles = useAuthStore((s) => s.rolesDisponibles);
  const setRolActivo = useAuthStore((s) => s.setRolActivo);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const usuario = useAuthStore((s) => s.usuario);

  return (
    <ScreenLayout>
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="gap-1 pt-2">
          <Text className="text-2xl font-bold text-gray-900">
            Hola{usuario?.nombre ? `, ${usuario.nombre}` : ""}
          </Text>
          <Text className="text-base text-gray-500">
            Tenés más de un rol en Veciyo. ¿Con cuál querés entrar?
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
