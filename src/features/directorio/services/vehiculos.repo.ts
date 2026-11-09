import { supabase } from "@/shared/services/supabase";

/**
 * Los vehículos de cada vivienda, para el directorio (09/11/2026,
 * Correcciones fila 24: «los vehículos deben salir en el directorio de
 * propiedades y poderlos buscar por placa»).
 *
 *   · los de quien vive ahí (`vehiculo_residente`);
 *   · los de las visitas y huéspedes que están **dentro** ahora
 *     (`vehiculo_visita` de una visita «ingresada»).
 *
 * Lo que se lee lo decide RLS: la administración y la portería del edificio
 * ven los de sus viviendas (`puede_operar_unidad`, `puede_ver_visita`).
 */
export interface VehiculoDelDirectorio {
  placa: string;
  tipo: string | null;
  marca: string | null;
  color: string | null;
  /** De quien vive en la vivienda, o de una visita que está dentro. */
  de: "residente" | "visita";
}

export async function vehiculosPorUnidad(
  condominioId: string,
): Promise<Record<string, VehiculoDelDirectorio[]>> {
  const [residentes, visitas] = await Promise.all([
    supabase
      .from("vehiculo_residente")
      .select("placa, tipo, marca, color, unidad:unidad_id!inner ( id, condominio_id )")
      .eq("unidad.condominio_id", condominioId)
      .is("deleted_at", null),
    supabase
      .from("vehiculo_visita")
      .select("placa, tipo, marca, color, visita:visita_id!inner ( unidad_id, condominio_id, estado )")
      .eq("visita.condominio_id", condominioId)
      .eq("visita.estado", "ingresada"),
  ]);
  if (residentes.error) throw residentes.error;
  if (visitas.error) throw visitas.error;

  const porUnidad: Record<string, VehiculoDelDirectorio[]> = {};
  const poner = (unidadId: string | null | undefined, v: VehiculoDelDirectorio) => {
    if (!unidadId) return;
    (porUnidad[unidadId] ??= []).push(v);
  };
  for (const f of residentes.data ?? []) {
    poner(f.unidad?.id, { placa: f.placa, tipo: f.tipo, marca: f.marca, color: f.color, de: "residente" });
  }
  for (const f of visitas.data ?? []) {
    poner(f.visita?.unidad_id, { placa: f.placa, tipo: f.tipo, marca: f.marca, color: f.color, de: "visita" });
  }
  return porUnidad;
}

/** La placa sin espacios ni guiones, en mayúsculas: «abc-123» y «ABC 123» son la misma. */
export function placaParaBuscar(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
