import { useQuery } from "@tanstack/react-query";
import { urlFotoVisita } from "../services/visitas.repo";

/**
 * Las fotos del documento que subió el huésped en su preregistro, firmadas
 * para poder enseñarlas. Solo las suyas (`documento-…`), no las de portería.
 *
 * La portería las ve desde el 16/10/2026 para confirmar en la entrada que es la
 * misma persona. La base decide: si no le toca, la firma falla y no sale nada.
 */
export function useFotosDelDocumento(rutas: string[] | undefined) {
  const delHuesped = (rutas ?? []).filter((r) => (r.split("/").pop() ?? "").startsWith("documento-"));
  return useQuery({
    queryKey: ["visitas", "fotos-documento", ...delHuesped],
    queryFn: async () => {
      const urls = await Promise.all(delHuesped.map((r) => urlFotoVisita(r).catch(() => null)));
      return urls.filter((u): u is string => Boolean(u));
    },
    enabled: delHuesped.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}
