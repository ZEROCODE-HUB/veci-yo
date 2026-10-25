import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";

export interface DatosDePais {
  codigo: string;
  moneda: string | null;
  zonaHoraria: string | null;
}

/**
 * La moneda y la zona horaria de cada país, de la tabla `pais`.
 *
 * La app tenía su propia lista país→moneda y país→zona en `monedas.ts`,
 * distinta de la de la base, que es la que usa el edificio al nacer
 * (`completar_condominio_segun_su_pais`). Dos listas que se separan en
 * silencio (Parametrización, 25/10/2026).
 */
export function useDatosDePaises() {
  const { data } = useQuery({
    queryKey: ["catalogo", "paises", "moneda-y-zona"],
    queryFn: async (): Promise<DatosDePais[]> => {
      const { data: filas, error } = await supabase
        .from("pais")
        .select("codigo, moneda, zona_horaria")
        .eq("activo", true);
      if (error) throw error;
      return (filas ?? []).map((p) => ({
        codigo: p.codigo,
        moneda: p.moneda,
        zonaHoraria: p.zona_horaria,
      }));
    },
    staleTime: Infinity,
  });
  const de = (codigo: string | null | undefined) =>
    (data ?? []).find((p) => p.codigo === (codigo ?? "").toUpperCase());
  return {
    monedaDelPais: (codigo: string | null | undefined) => de(codigo)?.moneda ?? "",
    zonaHorariaDelPais: (codigo: string | null | undefined) => de(codigo)?.zonaHoraria ?? "",
  };
}
