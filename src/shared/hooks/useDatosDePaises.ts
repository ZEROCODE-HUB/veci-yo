import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";

export interface DatosDePais {
  codigo: string;
  moneda: string | null;
  zonaHoraria: string | null;
  altaDeEdificio: boolean;
}

/**
 * La moneda y la zona horaria de cada país, de la tabla `pais`.
 *
 * La app tenía su propia lista país→moneda y país→zona en `monedas.ts`,
 * distinta de la de la base, que es la que usa el edificio al nacer
 * (`completar_condominio_segun_su_pais`). Dos listas que se separan en
 * silencio (Parametrización, 25/10/2026).
 *
 * Y en qué países opera Veciyo (`alta_de_edificio`): el país de un edificio se
 * elige solo entre esos, porque de él dependen los documentos que se piden en
 * la puerta y los reportes al ministerio (26/10/2026, cuando la lista de
 * países pasó a ser la del mundo entero).
 */
export function useDatosDePaises() {
  const { data } = useQuery({
    queryKey: ["catalogo", "paises", "moneda-y-zona"],
    queryFn: async (): Promise<DatosDePais[]> => {
      const { data: filas, error } = await supabase
        .from("pais")
        .select("codigo, moneda, zona_horaria, alta_de_edificio")
        .eq("activo", true);
      if (error) throw error;
      return (filas ?? []).map((p) => ({
        codigo: p.codigo,
        moneda: p.moneda,
        zonaHoraria: p.zona_horaria,
        altaDeEdificio: p.alta_de_edificio,
      }));
    },
    staleTime: Infinity,
  });
  const de = (codigo: string | null | undefined) =>
    (data ?? []).find((p) => p.codigo === (codigo ?? "").toUpperCase());
  return {
    monedaDelPais: (codigo: string | null | undefined) => de(codigo)?.moneda ?? "",
    zonaHorariaDelPais: (codigo: string | null | undefined) => de(codigo)?.zonaHoraria ?? "",
    paisesDondeOpera: (data ?? []).filter((p) => p.altaDeEdificio).map((p) => p.codigo),
  };
}
