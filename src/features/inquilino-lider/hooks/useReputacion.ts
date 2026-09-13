import { useQuery } from "@tanstack/react-query";
import { reputacionInsigniasVecino } from "@/features/home/homeMockData";
import { obtenerReputacionRequest } from "../services";

export function useReputacion() {
  const query = useQuery({
    queryKey: ["inquilino-lider", "reputacion"],
    queryFn: obtenerReputacionRequest,
  });

  return {
    ...query,
    insignias: query.data || reputacionInsigniasVecino,
  };
}
