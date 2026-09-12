import { useQuery } from "@tanstack/react-query";
import { useZonasStore } from "@/stores/zonas-store";
import { obtenerDatosZonas } from "../services/zonas.service";

export const ZONAS_QUERY_KEY = ["zonas"];

export function useZonas() {
  const store = useZonasStore();
  const query = useQuery({
    queryKey: ZONAS_QUERY_KEY,
    queryFn: obtenerDatosZonas,
  });

  return {
    ...store,
    ...query,
    zonasComunesConfig: store.zonasComunesConfig,
    gestionZonas: store.gestionZonas,
    reservas: store.reservas,
  };
}
