import { useEffect } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useNavegacion } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import type { SharedStackParamList, VisitaItem } from "@/shared/types";

/**
 * Lo que llega desde el Inicio de la portería (14/10/2026): «Buscar» llega con
 * el texto puesto, y el QR de un huésped llega con la estancia que hay que
 * abrir. Salió de `VisitasHistorialScreen` el 26/10/2026.
 */
export function useAbrirDesdeElInicio({
  items,
  cargando,
  setSearch,
  abrir,
}: {
  items: VisitaItem[];
  cargando: boolean;
  setSearch: (texto: string) => void;
  abrir: (item: VisitaItem) => void;
}) {
  const navigation = useNavegacion();
  const route = useRoute<RouteProp<SharedStackParamList, "Visitas">>();
  const busquedaInicial = route.params?.busqueda;
  const abrirEstancia = route.params?.abrir;
  const { addToast } = useUIStore();

  useEffect(() => {
    if (busquedaInicial) setSearch(busquedaInicial);
  }, [busquedaInicial, setSearch]);

  useEffect(() => {
    if (!abrirEstancia) return;
    const encontrada = items.find((v) => v.uuid === abrirEstancia);
    if (!encontrada) {
      /*
        Cargada la lista y sin ella: se dice, en vez de quedarse igual
        (26/10/2026: «escaneé un QR y no me llevó a la reserva»).
      */
      if (!cargando) {
        addToast("Esa reserva no está en tu lista de hoy", "info");
        navigation.setParams({ abrir: undefined });
      }
      return;
    }
    abrir(encontrada);
    navigation.setParams({ abrir: undefined });
    // `abrir` es un setter de estado de quien llama: no cambia entre pintadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirEstancia, items, navigation, cargando, addToast]);
}
