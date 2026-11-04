import { supabase } from "@/shared/services/supabase";
import { fijarRelojDelEdificio } from "@/shared/utils/reloj.util";

/**
 * Le pregunta la hora a la base y corrige el reloj de la app (ver
 * `reloj.util.ts`). Se toma el reloj del teléfono a mitad del viaje, para que
 * lo que tarda la respuesta no cuente como desfase.
 */
export async function sincronizarRelojDelEdificio(condominioId: string | null) {
  const salida = Date.now();
  const { data, error } = await supabase.rpc("reloj_del_edificio", {
    p_condominio_id: condominioId ?? undefined,
  });
  if (error) throw error;
  const fila = data?.[0];
  if (!fila) return;
  const llegada = Date.now();
  fijarRelojDelEdificio(
    { ahoraMs: Number(fila.ahora_ms), ahoraLocal: fila.ahora_local },
    Math.round((salida + llegada) / 2),
  );
}
