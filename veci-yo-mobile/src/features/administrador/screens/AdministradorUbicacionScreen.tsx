import { ScrollView, View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { UbicacionForm } from "../components/ubicacion";
import { useAdministradorUbicacion } from "../hooks";
import { defaultUbicacion } from "../types";

export function AdministradorUbicacionScreen() {
  const saveUbicacion = useAdministradorUbicacion();

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Administracion ubicacion" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <UbicacionForm
          initialValues={defaultUbicacion}
          onSubmit={(values) => saveUbicacion.mutate(values)}
        />
      </ScrollView>
    </View>
  );
}
