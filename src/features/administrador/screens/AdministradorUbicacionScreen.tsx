import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import { PageHeader } from "@/shared/layouts";
import { UbicacionForm } from "../components/ubicacion";
import { useAdministradorUbicacion } from "../hooks";

export function AdministradorUbicacionScreen() {
  const { valores, cargando, guardar, guardando } = useAdministradorUbicacion();

  if (cargando) {
    return (
      <View className="flex-1 bg-bg-app items-center justify-center">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!valores) {
    return (
      <View className="flex-1 bg-bg-app items-center justify-center p-6">
        <Text className="text-base text-gray-500 text-center">
          No encontramos los datos de tu condominio.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Administracion ubicacion" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <UbicacionForm
          initialValues={valores}
          onSubmit={guardar}
          guardando={guardando}
          ayuda="Una vez configurado el condominio, ve a la sección Arquitectura para registrar torres, bloques, pisos, unidades y asignar propietarios."
        />
      </ScrollView>
    </View>
  );
}
