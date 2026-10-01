import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/services/supabase";
import { useAuthStore } from "@/stores";
import { formatDate } from "@/shared/utils";

/**
 * Consumo del paquete de verificaciones de antecedentes de una vivienda.
 *
 * La pantalla lo mostraba con cuatro numeros fijos en el cliente -- 20
 * incluidas, 5 usadas, 10 suplementarias y vencimiento el 27/10/2026 --, que
 * son los que deciden si un anfitrion puede recibir al siguiente huesped.
 *
 * Sale de `consumo_verificaciones`, que cruza lo que trae la suscripcion, lo
 * comprado aparte y lo ya consumido (migracion 20260922160000).
 */
export function useConsumoVerificaciones() {
  const unidades = useAuthStore((s) => s.unidades);
  // El consumo es por vivienda; se muestra el de la primera del usuario.
  const unidadId = unidades[0]?.unidadId ?? "";

  const { data } = useQuery({
    queryKey: ["visitas", "verificaciones", unidadId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("consumo_verificaciones", {
        p_unidad_id: unidadId,
      });
      if (error) throw error;

      const fila = (data ?? [])[0];
      if (!fila) return null;

      return {
        incluidas: fila.incluidas,
        suscritasUsadas: fila.suscritas_usadas,
        // Lo que queda del paquete comprado, no lo comprado en total.
        suplementarias: Math.max(
          fila.suplementarias - fila.suplementarias_usadas,
          0,
        ),
        vencimientoSuplementarias: fila.vencimiento_suplementarias
          ? formatDate(new Date(`${fila.vencimiento_suplementarias}T00:00:00`))
          : "",
      };
    },
    enabled: Boolean(unidadId),
  });

  // Sin suscripcion de renta corta no hay paquete que mostrar.
  return data ?? null;
}
