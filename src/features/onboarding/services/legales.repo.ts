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

/*
  Aqui estaba `obtenerLegalesDelCondominio`, que no llamaba nadie. Nacio para el
  defecto R-5 --el precheckin desplegaba cuatro parrafos escritos a mano en la
  web mientras `documento_legal` tenia el reglamento del condominio, vigente y
  sin que lo leyera nadie-- y ese defecto **se arreglo por otro camino**: la web
  los pide con la RPC `legales_de_la_estancia`, que ademas funciona sin sesion
  --quien abre el enlace todavia no tiene cuenta-- y lo comprueba el recorrido
  `legales-de-la-estancia`.

  Se quito el 29/09/2026. Dos formas de traer lo mismo son la duplicacion que ya
  costo caro en este proyecto; y esta no llegaba a usarse, asi que su unica
  funcion era parecer que el asunto seguia abierto.
*/
