import { supabase } from "@/shared/services/supabase";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";

/**
 * El intercomunicador: llamadas por internet entre vivienda, portería y
 * administración (14/10/2026; la administración desde el 28/10/2026). Aquí está quién llama a quién y en qué quedó; la voz va por
 * LiveKit (`vozDeLlamada.ts`, que depende de la plataforma y por eso vive
 * aparte de este repositorio).
 */

export type EstadoLlamada = "sonando" | "en_curso" | "terminada" | "rechazada" | "perdida";

export type DestinoLlamada = "porteria" | "vivienda" | "administracion";
export type OrigenLlamada = "vivienda" | "porteria" | "administracion";

export interface LlamadaInternet {
  id: string;
  destino: DestinoLlamada;
  /** Desde dónde llaman. Nulo en las de antes del 28/10/2026. */
  origen: OrigenLlamada | null;
  estado: EstadoLlamada;
  /** Quién llama, para enseñarlo en la llamada entrante. */
  deUsuarioId: string;
  deUnidad: string | null;
  /** Nombre y apellido de quien llama, si se puede leer su perfil (29/10/2026). */
  deNombre?: string | null;
  aUnidad: string | null;
  creadaEn: string;
}

const SELECT = `
  id, destino, origen, estado, de_usuario_id, created_at,
  de:de_unidad_id ( codigo ), a:a_unidad_id ( codigo )
` as const;

function mapear(fila: {
  id: string;
  destino: DestinoLlamada;
  origen: OrigenLlamada | null;
  estado: EstadoLlamada;
  de_usuario_id: string;
  created_at: string;
  de: { codigo: string } | null;
  a: { codigo: string } | null;
}): LlamadaInternet {
  return {
    id: fila.id,
    destino: fila.destino,
    origen: fila.origen,
    estado: fila.estado,
    deUsuarioId: fila.de_usuario_id,
    deUnidad: fila.de?.codigo ?? null,
    aUnidad: fila.a?.codigo ?? null,
    creadaEn: fila.created_at,
  };
}

/** A quién se llama y desde dónde. */
export interface DatosDeLlamada {
  destino: DestinoLlamada;
  /** La vivienda a la que se llama (destino «vivienda»). */
  aUnidadId?: string | null;
  /** La vivienda desde la que llama un vecino o un huésped. */
  desdeUnidadId?: string | null;
  /** El edificio, cuando no se llama desde una vivienda ni a una. */
  condominioId?: string | null;
}

function parametrosDe(datos: DatosDeLlamada) {
  return {
    p_destino: datos.destino,
    p_a_unidad_id: datos.aUnidadId || undefined,
    p_desde_unidad_id: datos.desdeUnidadId || undefined,
    p_condominio_id: datos.condominioId || undefined,
  };
}

/**
 * Empieza una llamada por la app. La base decide si quien llama puede llamar
 * a ese destino, y falla si allí nadie recibe llamadas por la app.
 */
export async function llamarPorInternet(datos: DatosDeLlamada): Promise<string> {
  const { data, error } = await supabase.rpc("llamar_por_internet", parametrosDe(datos));
  if (error) throw error;
  return data as string;
}

/** Una vivienda llama a la portería de su edificio. */
export function llamarAPorteria(desdeUnidadId: string): Promise<string> {
  return llamarPorInternet({ destino: "porteria", desdeUnidadId });
}

/** La portería (o la administración) llama a una vivienda. */
export function llamarAVivienda(unidadId: string): Promise<string> {
  return llamarPorInternet({ destino: "vivienda", aUnidadId: unidadId });
}

/**
 * Si al otro lado hay alguien que recibe llamadas por la app. Si no --todos
 * las apagaron en su configuración--, la pantalla solo ofrece el teléfono.
 */
export async function sePuedeLlamarPorLaApp(
  datos: DatosDeLlamada & { condominioId: string },
): Promise<boolean> {
  const { data, error } = await supabase.rpc("se_puede_llamar_por_la_app", {
    p_destino: datos.destino,
    p_condominio_id: datos.condominioId,
    p_a_unidad_id: datos.aUnidadId || undefined,
    p_desde_unidad_id: datos.desdeUnidadId || undefined,
  });
  if (error) throw error;
  return Boolean(data);
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
  return data ? (await conNombres([mapear(data)]))[0] : null;
}

/**
 * Nombre y apellido de quien llama (pedido del cliente, 29/10/2026: «que te
 * salga el nombre completo»). Si su perfil no se puede leer, queda sin nombre
 * y se ve como antes: «Administración», «Vivienda 102».
 */
async function conNombres(llamadas: LlamadaInternet[]): Promise<LlamadaInternet[]> {
  const ids = [...new Set(llamadas.map((l) => l.deUsuarioId).filter(Boolean))];
  if (ids.length === 0) return llamadas;
  const { data } = await supabase.from("perfil").select("id, nombre, apellido").in("id", ids);
  const nombres = new Map(
    (data ?? []).map((p) => [p.id, `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()]),
  );
  return llamadas.map((l) => ({ ...l, deNombre: nombres.get(l.deUsuarioId) || null }));
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
  return conNombres((data ?? []).map(mapear));
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
