import { supabase } from "@/shared/services/supabase";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";

/**
 * El intercomunicador: llamadas por internet entre vivienda y portería
 * (14/10/2026). Aquí está quién llama a quién y en qué quedó; la voz va por
 * LiveKit (`vozDeLlamada.ts`, que depende de la plataforma y por eso vive
 * aparte de este repositorio).
 */

export type EstadoLlamada = "sonando" | "en_curso" | "terminada" | "rechazada" | "perdida";

export interface LlamadaInternet {
  id: string;
  destino: "porteria" | "vivienda";
  estado: EstadoLlamada;
  /** Quién llama, para enseñarlo en la llamada entrante. */
  deUsuarioId: string;
  deUnidad: string | null;
  aUnidad: string | null;
  creadaEn: string;
}

const SELECT = `
  id, destino, estado, de_usuario_id, created_at,
  de:de_unidad_id ( codigo ), a:a_unidad_id ( codigo )
` as const;

function mapear(fila: {
  id: string;
  destino: "porteria" | "vivienda";
  estado: EstadoLlamada;
  de_usuario_id: string;
  created_at: string;
  de: { codigo: string } | null;
  a: { codigo: string } | null;
}): LlamadaInternet {
  return {
    id: fila.id,
    destino: fila.destino,
    estado: fila.estado,
    deUsuarioId: fila.de_usuario_id,
    deUnidad: fila.de?.codigo ?? null,
    aUnidad: fila.a?.codigo ?? null,
    creadaEn: fila.created_at,
  };
}

/** Una vivienda llama a la portería de su edificio. */
export async function llamarAPorteria(desdeUnidadId: string): Promise<string> {
  const { data, error } = await supabase.rpc("llamar_por_internet", {
    p_destino: "porteria",
    p_desde_unidad_id: desdeUnidadId,
  });
  if (error) throw error;
  return data as string;
}

/** La portería llama a una vivienda (si la administración se lo habilitó). */
export async function llamarAVivienda(unidadId: string): Promise<string> {
  const { data, error } = await supabase.rpc("llamar_por_internet", {
    p_destino: "vivienda",
    p_a_unidad_id: unidadId,
  });
  if (error) throw error;
  return data as string;
}

export async function contestarLlamada(id: string): Promise<void> {
  const { error } = await supabase.rpc("contestar_llamada", { p_llamada_id: id });
  if (error) throw error;
}

export async function rechazarLlamada(id: string): Promise<void> {
  const { error } = await supabase.rpc("rechazar_llamada", { p_llamada_id: id });
  if (error) throw error;
}

export async function colgarLlamada(id: string): Promise<void> {
  const { error } = await supabase.rpc("colgar_llamada", { p_llamada_id: id });
  if (error) throw error;
}

/** Una llamada por su id (la que estoy haciendo o atendiendo). */
export async function obtenerLlamada(id: string): Promise<LlamadaInternet | null> {
  const { data, error } = await supabase
    .from("llamada_internet")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapear(data) : null;
}

/**
 * Las que me están sonando: de otro, en «sonando», de hace menos de un minuto.
 * RLS ya decide de quién son (la portería con permiso, o mi vivienda).
 */
export async function llamadasQueMeSuenan(miUsuarioId: string): Promise<LlamadaInternet[]> {
  const haceUnMinuto = new Date(Date.now() - 60_000).toISOString();
  const { data, error } = await supabase
    .from("llamada_internet")
    .select(SELECT)
    .eq("estado", "sonando")
    .neq("de_usuario_id", miUsuarioId)
    .gte("created_at", haceUnMinuto)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapear);
}

/** El permiso para entrar a la sala de voz, firmado por el servidor. */
export async function permisoDeVoz(
  llamadaId: string,
): Promise<{ servidor: string; token: string }> {
  const { data, error } = await supabase.functions.invoke("token-llamada", {
    body: { llamadaId },
  });
  if (error) {
    throw new Error((await motivoDeLaFuncion(error)) ?? "No se pudo conectar la llamada");
  }
  return data as { servidor: string; token: string };
}
