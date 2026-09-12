import { useQuery } from "@tanstack/react-query";
import { useVisitasStore } from "@/stores/visitas-store";
import { obtenerVisitas } from "../services/visita.service";

export const VISITAS_QUERY_KEY = ["visitas"];

export function useVisitas() {
  const store = useVisitasStore();
  const query = useQuery({
    queryKey: VISITAS_QUERY_KEY,
    queryFn: obtenerVisitas,
  });
  return { ...store, ...query, items: store.items };
}
