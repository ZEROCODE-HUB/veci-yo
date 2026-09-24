import { supabase } from "@/shared/services/supabase";

/**
 * Los documentos legales que se aceptan al registrarse.
 *
 * Vivían en `LegalAccordion.tsx`, escritos a mano y con **un párrafo de
 * relleno cada uno**: "Al registrarse en VeciYo, el usuario acepta cumplir con
 * los presentes términos y condiciones de uso", y ahí se acababa. Para poner
 * el texto de verdad había que publicar la aplicación.
 *
 * Los de la plataforma se leen **sin sesión**: la pantalla está en el stack de
 * autenticación, y pedirle a alguien que acepte unos términos que no puede
 * leer no es una opción.
 */

export interface DocumentoLegal {
  id: string;
  titulo: string;
  contenido: string;
}

/**
 * Los de la plataforma. `condominio_id` nulo los distingue de los de un
 * edificio, que solo ve quien pertenece a él.
 */
export async function obtenerLegalesDePlataforma(): Promise<DocumentoLegal[]> {
  const { data, error } = await supabase
    .from("documento_legal")
    .select("id, titulo, contenido, tipo")
    .is("condominio_id", null)
    .eq("vigente", true)
    .order("tipo");

  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    contenido: fila.contenido,
  }));
}

/** Los del edificio, para quien ya está dentro. */
export async function obtenerLegalesDelCondominio(
  condominioId: string,
): Promise<DocumentoLegal[]> {
  if (!condominioId) return [];

  const { data, error } = await supabase
    .from("documento_legal")
    .select("id, titulo, contenido")
    .eq("condominio_id", condominioId)
    .eq("vigente", true);

  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    contenido: fila.contenido,
  }));
}
