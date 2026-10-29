import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { fijarDecimalesDeMonedas } from "@/shared/utils/date.util";

export interface Moneda {
  codigo: string;
  nombre: string;
  decimales: number;
  activa: boolean;
}

/**
 * Las monedas de la base (28/10/2026).
 *
 * Había una lista escrita en el código (`MONEDAS`) con siete; el cliente
 * decidió que se sale solo con COP, PEN y USD, y que se cambie desde el panel
 * de la app (Más › Monedas). Se ofrecen las encendidas, y además **la que ya
 * tenga guardada** quien edita: un edificio con una moneda que se apagó
 * después no debe ver su campo vacío ni perderla al guardar otra cosa.
 *
 * De paso le dice al formato de dinero cuántos decimales lleva cada una.
 */
export function useMonedas(actual?: string | null) {
  const { data } = useQuery({
    queryKey: ["catalogo", "monedas"],
    queryFn: async (): Promise<Moneda[]> => {
      const { data: filas, error } = await supabase
        .from("moneda")
        .select("codigo, nombre, decimales, activa, orden")
        .order("orden");
      if (error) throw error;
      const monedas = (filas ?? []).map((m) => ({
        codigo: m.codigo.trim(),
        nombre: m.nombre,
        decimales: m.decimales,
        activa: m.activa,
      }));
      fijarDecimalesDeMonedas(monedas);
      return monedas;
    },
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const todas = data ?? [];
    const ofrecidas = todas.filter((m) => m.activa || m.codigo === actual?.trim());
    return {
      cargadas: Boolean(data),
      monedas: ofrecidas,
      opciones: ofrecidas.map((m) => ({
        value: m.codigo,
        label: `${m.codigo} · ${m.nombre}${m.activa ? "" : " (ya no se ofrece)"}`,
      })),
    };
  }, [data, actual]);
}
