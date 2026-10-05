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
      "id, nombre, direccion, ciudad, pais, moneda, identificacion_fiscal, telefono, codigo_pais, email",
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
    /*
      Sin pais guardado se cae al del edificio, que es la suposicion razonable
      y mejor que dejarlo vacio: `condominio.codigo_pais` existe desde el
      principio y **nadie la escribia**, asi que todas las filas lo tienen en
      null y el numero que hay guardado no se puede marcar desde fuera.
    */
    codigoPais: data.codigo_pais ?? data.pais ?? "",
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
      codigo_pais: valores.codigoPais || null,
      email: valores.email || null,
    })
    .eq("id", condominioId);
  if (error) throw error;
}

/**
 * Si la portería tiene que comparar el documento del invitado al entrar.
 *
 * Lo decide el edificio para todas sus visitas, por decisión del cliente del
 * 29/09/2026. Antes lo decidía el formulario por el tipo de visita --amigos
 * nunca, el resto siempre-- mientras a quien invitaba se le pedía el documento
 * y se le decía que su invitado lo presentara en portería. Punto 66 de
 * `REVISAR-A-OJO.md`.
 *
 * Lo puede leer cualquier miembro del condominio: el residente que crea la
 * visita necesita saberlo para guardarla con la instrucción correcta.
 */
export async function obtenerVerificacionDeDocumento(
  condominioId: string,
): Promise<boolean> {
  if (!condominioId) return true;
  const { data, error } = await supabase
    .from("condominio")
    .select("verificar_documento_visitas")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  // Sin dato se verifica: es lo prudente en la puerta.
  return data?.verificar_documento_visitas ?? true;
}

/** Solo la administración; lo sujeta `condominio_escritura`. */
export async function guardarVerificacionDeDocumento(
  condominioId: string,
  verificar: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("condominio")
    .update({ verificar_documento_visitas: verificar })
    .eq("id", condominioId);
  if (error) throw error;
}
