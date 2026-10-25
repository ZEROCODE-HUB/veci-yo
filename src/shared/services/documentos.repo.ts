import { supabase } from "./supabase";
import type { Database } from "@/shared/types/database.types";

type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];
type Fila = Database["public"]["Tables"]["documento_del_pais"]["Row"];

/**
 * Cómo se pide un documento en un país (25/10/2026).
 *
 * Vive en `documento_del_pais` y lo edita el dueño de la plataforma desde el
 * panel (Más → Países). Antes la lista y sus reglas estaban escritas en la app
 * y en la web, iguales para todos los países: un edificio de Colombia ofrecía
 * el carné de extranjería de Perú.
 */
export interface ReglaDeDocumento {
  tipo: TipoDocumento;
  etiqueta: string;
  paraAdultos: boolean;
  paraMenores: boolean;
  soloCifras: boolean;
  largoMinimo: number;
  largoMaximo: number;
  dosCaras: boolean;
  pideFechaExpedicion: boolean;
}

export function reglaDesdeFila(f: Fila): ReglaDeDocumento {
  return {
    tipo: f.tipo,
    etiqueta: f.etiqueta,
    paraAdultos: f.para_adultos,
    paraMenores: f.para_menores,
    soloCifras: f.solo_cifras,
    largoMinimo: f.largo_minimo,
    largoMaximo: f.largo_maximo,
    dosCaras: f.dos_caras,
    pideFechaExpedicion: f.pide_fecha_expedicion,
  };
}

/** Los que se ofrecen en el país de ese edificio, en su orden. */
export async function documentosDelEdificio(condominioId: string): Promise<ReglaDeDocumento[]> {
  const { data, error } = await supabase.rpc("documentos_del_edificio", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return (data ?? []).map(reglaDesdeFila);
}

/**
 * Los que se ofrecen al crear una cuenta, que todavía no es de ningún
 * edificio: los de adultos de los países donde se dan de alta edificios, con
 * la regla más abierta de cada tipo.
 */
export async function documentosParaRegistrarse(): Promise<ReglaDeDocumento[]> {
  const { data, error } = await supabase.rpc("documentos_para_registrarse");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    tipo: f.tipo,
    etiqueta: f.etiqueta,
    paraAdultos: true,
    paraMenores: false,
    soloCifras: f.solo_cifras,
    largoMinimo: f.largo_minimo,
    largoMaximo: f.largo_maximo,
    dosCaras: f.dos_caras,
    pideFechaExpedicion: false,
  }));
}

/** Las opciones de un selector: la clave de la base y la etiqueta del país. */
export function opcionesDeDocumento(
  reglas: ReglaDeDocumento[],
  para: "adultos" | "menores" = "adultos",
): { value: string; label: string }[] {
  return reglas
    .filter((r) => (para === "menores" ? r.paraMenores : r.paraAdultos))
    .map((r) => ({ value: r.tipo, label: r.etiqueta }));
}
