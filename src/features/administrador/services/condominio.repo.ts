import { supabase } from "@/shared/services/supabase";
import type { UbicacionFormValues } from "../types/ubicacion";

/**
 * Datos del condominio.
 *
 * `pais` se guarda en ISO 3166-1 alfa-2 (`CO`, `PE`) porque de ahi dependen
 * cosas del dominio: el tipo de documento que se pide, la etiqueta del
 * identificador fiscal y el formato de los reportes legales. El nombre
 * completo es solo presentacion.
 */

export const PAISES: Record<string, string> = {
  CO: "Colombia",
  PE: "Perú",
};

export const PAIS_DESDE_NOMBRE: Record<string, string> = {
  Colombia: "CO",
  "Perú": "PE",
  Peru: "PE",
};

/** RUC en Peru, NIT en Colombia. */
export function etiquetaIdentificacionFiscal(pais: string): string {
  return pais === "PE" ? "RUC" : "NIT";
}

export async function obtenerCondominio(condominioId: string) {
  const { data, error } = await supabase
    .from("condominio")
    .select(
      "id, nombre, direccion, ciudad, pais, moneda, identificacion_fiscal, telefono, email",
    )
    .eq("id", condominioId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const valores: UbicacionFormValues = {
    nombre: data.nombre,
    direccion: data.direccion,
    ciudad: data.ciudad ?? "",
    pais: PAISES[data.pais] ?? data.pais,
    ruc: data.identificacion_fiscal ?? "",
    telefono: data.telefono ?? "",
    email: data.email ?? "",
  };
  return { valores, paisIso: data.pais, moneda: data.moneda };
}

export async function actualizarCondominio(
  condominioId: string,
  valores: UbicacionFormValues,
) {
  const { error } = await supabase
    .from("condominio")
    .update({
      nombre: valores.nombre,
      direccion: valores.direccion,
      ciudad: valores.ciudad || null,
      pais: PAIS_DESDE_NOMBRE[valores.pais] ?? valores.pais.slice(0, 2).toUpperCase(),
      identificacion_fiscal: valores.ruc || null,
      telefono: valores.telefono || null,
      email: valores.email || null,
    })
    .eq("id", condominioId);
  if (error) throw error;
}
