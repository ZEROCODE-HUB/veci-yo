import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

export type NombreDeLista = Database["public"]["Enums"]["nombre_catalogo"];

export interface OpcionDeLista {
  codigo: string;
  etiqueta: string;
  activo: boolean;
  pais: string | null;
  extra: Record<string, unknown>;
}

/**
 * Una lista de opciones de la base (`catalogo_opcion`), 28/10/2026.
 *
 * Las listas vivían escritas en cada pantalla; ahora el administrador de la
 * app las renombra, ordena, oculta y --las que lo admiten-- amplía en Panel ›
 * Más › Listas. Cada pantalla pide la suya aquí.
 *
 * `opciones` son las encendidas, en su orden: lo que se **ofrece**.
 * `etiquetaDe` nombra también las apagadas, porque un dato guardado con una
 * opción que después se ocultó tiene que seguir leyéndose bien.
 *
 * Mientras no ha llegado, `opciones` está vacía y `cargada` es false: no hay
 * lista de respaldo escrita aquí a propósito (es la que se quería quitar).
 */
export function useLista(lista: NombreDeLista, pais?: string | null) {
  const { data } = useQuery({
    queryKey: ["catalogo", "lista", lista],
    queryFn: async (): Promise<OpcionDeLista[]> => {
      const { data: filas, error } = await supabase
        .from("catalogo_opcion")
        .select("codigo, etiqueta, activo, pais, orden, extra")
        .eq("catalogo", lista)
        .order("orden")
        .order("etiqueta");
      if (error) throw error;
      return (filas ?? []).map((f) => ({
        codigo: f.codigo,
        etiqueta: f.etiqueta,
        activo: f.activo,
        pais: f.pais?.trim() ?? null,
        extra: (f.extra && typeof f.extra === "object" && !Array.isArray(f.extra)
          ? f.extra
          : {}) as Record<string, unknown>,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const todas = (data ?? []).filter((o) => !o.pais || !pais || o.pais === pais);
    const porCodigo = new Map(todas.map((o) => [o.codigo, o]));
    return {
      cargada: Boolean(data),
      opciones: todas.filter((o) => o.activo),
      /** El nombre de un código guardado, aunque la opción ya no se ofrezca. */
      etiquetaDe: (codigo: string | null | undefined): string =>
        codigo ? (porCodigo.get(codigo)?.etiqueta ?? codigo) : "",
      opcion: (codigo: string | null | undefined) => (codigo ? porCodigo.get(codigo) : undefined),
    };
  }, [data, pais]);
}
