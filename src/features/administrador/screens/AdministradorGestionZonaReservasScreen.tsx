import { useRoute, useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { useZonas } from "@/features/zonas/hooks";
import { GestionZonaReservasView } from "../components/reservasZona";
export function AdministradorGestionZonaReservasScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const id = route.params?.id as string;
  const { gestionZonas } = useZonas();
  const zona = gestionZonas[id];
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={`Reservas - ${zona?.nombre || id}`} onBack={() => navigation.goBack()} />
      <GestionZonaReservasView
        id={id}
        onCreate={(depto) =>
          navigation.navigate("ZonaReservar", {
            zonaId: id,
            deptoReserva: depto,
          })
        }
      />
    </View>
  );
}
