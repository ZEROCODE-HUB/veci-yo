import { View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { useZonas } from "@/features/zonas/hooks";
import { GestionZonaReservasView } from "../components/reservasZona";
import { useNavegacion, useParametros } from "@/shared/hooks";
export function AdministradorGestionZonaReservasScreen() {
  const parametros = useParametros("GestionZonaReservas");
  const navigation = useNavegacion();
  const id = parametros?.id as string;
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
