import {ScrollView, Text, View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { UbicacionForm } from "../components/ubicacion";
import { useAdministradorUbicacion } from "../hooks";
import { SegunLaCarga } from "@/shared/components";

export function AdministradorUbicacionScreen() {
  const { valores, estado, guardar, guardando } = useAdministradorUbicacion();

  /*
    Con su cabecera también mientras carga o si falla: sin ella no había
    botón para volver atrás (13/11/2026).
  */
  if (estado.cargando || estado.fallo || !valores) {
    return (
      <View className="flex-1 bg-bg-app">
        <PageHeader title="Administracion ubicacion" />
        <SegunLaCarga estado={estado} texto="los datos del edificio" forma="formulario">
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-base text-gray-500 text-center">
              No encontramos los datos de tu condominio.
            </Text>
          </View>
        </SegunLaCarga>
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
