import { supabase } from "@/shared/services/supabase";
import { TIPO_DOCUMENTO } from "@/shared/constants/enums";
import type { Database } from "@/shared/types/database.types";

type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];

export interface ResultadoDelMensaje {
  unidadId: string;
  /** Vacío cuando la vivienda no es de quien envía: la base no la nombra. */
  codigo: string | null;
  enviado: boolean;
  motivo: string | null;
  conversacionId: string | null;
}

/**
 * Un mismo mensaje a varias viviendas (16/11/2026, cliente: «poder
 * seleccionar masivamente, y poder enviar un mensaje»).
 *
 * Llega por el chat de cada vivienda con la administración, con su aviso push:
 * lo escribe `mensaje_a_viviendas`, que comprueba vivienda por vivienda que
 * quien envía administra su edificio y crea la conversación si no existe.
 * Devuelve una fila por vivienda, para poder decir cuáles fallaron.
 */
export async function enviarMensajeAViviendas(
  unidades: string[],
  texto: string,
): Promise<ResultadoDelMensaje[]> {
  const { data, error } = await supabase.rpc("mensaje_a_viviendas", {
    p_unidades: unidades,
    p_texto: texto,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    unidadId: f.unidad_id,
    codigo: f.codigo,
    enviado: f.enviado,
    motivo: f.motivo,
    conversacionId: f.conversacion_id,
  }));
}

export interface PersonaPermanente {
  visitaId: string;
  nombre: string;
  profesion: string | null;
  /** 0 domingo a 6 sábado, como en la visita. */
  diasTrabajo: number[];
  /** «Cédula de ciudadanía 1098765432», o vacío si no lo dejaron. */
  documento: string | null;
  codigoPais: string | null;
  telefono: string | null;
}

/**
 * Quién trabaja de forma permanente en una vivienda (16/11/2026, cliente:
 * «profesional permanente debe igual mostrarse en el directorio de
 * Viviendas, o sea sus datos»). Solo responde a la administración, la
 * portería y quien es de esa vivienda: la función lo comprueba antes de nada.
 */
export async function obtenerPersonalPermanente(unidadId: string): Promise<PersonaPermanente[]> {
  const { data, error } = await supabase.rpc("personal_permanente_de_la_vivienda", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  return (data ?? []).map((f) => {
    const tipo = f.tipo_documento ? TIPO_DOCUMENTO[f.tipo_documento as TipoDocumento] ?? f.tipo_documento : "";
    const documento = [tipo, f.documento_numero ?? ""].filter(Boolean).join(" ");
    return {
      visitaId: f.visita_id,
      nombre: f.nombre,
      profesion: f.profesion,
      diasTrabajo: f.dias_trabajo ?? [],
      documento: documento || null,
      codigoPais: f.codigo_pais,
      telefono: f.telefono,
    };
  });
}
