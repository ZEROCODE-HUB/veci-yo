import { useMemo } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { useZonasStore } from "@/stores";
import { GestionZonaForm } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
import { gestionZonaVacia } from "../types/gestionZona";
export function AdministradorGestionZonaFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const current = useZonasStore((state) =>
    id ? state.gestionZonas[id] : undefined,
  );
  const { saveZona } = useAdministradorGestionZonas();
  const initial = useMemo(() => current || gestionZonaVacia(), [current]);
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={id ? "Editar zona comun" : "Crear zona comun"} />
      <GestionZonaForm
        initial={initial}
        onSave={(value) => {
          saveZona(value);
          navigation.goBack();
        }}
      />
    </View>
  );
}
