import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { nombreDelCitofono } from "@/shared/utils/citofono.util";
import { useCondominioActivo } from "./useCondominioActivo";

/**
 * «Citófono Virtual» o «Intercomunicador Virtual», según el país del edificio
 * en el que se está (09/11/2026). Mientras se lee, el de Colombia.
 */
export function useNombreDelCitofono(): string {
  const condominioId = useCondominioActivo();
  const { data: pais } = useQuery({
    queryKey: ["condominio", "pais", condominioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominio")
        .select("pais")
        .eq("id", condominioId ?? "")
        .maybeSingle();
      if (error) throw error;
      return data?.pais ?? null;
    },
    enabled: Boolean(condominioId),
    staleTime: 60 * 60 * 1000,
  });
  return nombreDelCitofono(pais);
}
