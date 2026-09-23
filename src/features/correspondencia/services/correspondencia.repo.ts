import { supabase } from "@/shared/services/supabase";
import type { CorrespondenciaItem } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";
import { formatDate, formatTime } from "@/shared/utils";

type EstadoDB = Database["public"]["Enums"]["estado_correspondencia"];
type CategoriaDB = Database["public"]["Enums"]["categoria_correspondencia"];
type CondicionDB = Database["public"]["Enums"]["estado_encomienda"];

/**
 * El prototipo guardaba nueve pares fecha/hora en columnas separadas y dos
 * campos de estado sin relación documentada. En la base son tres `timestamptz`
 * con su actor, y dos estados con significados explícitos: `estado` es dónde
 * está el paquete, `condicion` en qué estado llegó.
 */

const SELECT = `
  id, empresa, logistica, categoria, descripcion, estado, condicion,
  entrega_en_puerta, destinatario_nombre, destinatario_documento,
  registrada_en, recibida_en, entregada_en, entregada_a,
  registrada_por:perfil!correspondencia_registrada_por_perfil_fkey ( nombre, apellido ),
  recibida_por:perfil!correspondencia_recibida_por_perfil_fkey ( nombre, apellido ),
  unidad:unidad_id ( id, codigo, piso, torre:torre_id ( numero ) ),
  incidencias:incidencia_correspondencia ( descripcion, fotos, reportada_en )
`;

const ESTADO_DESDE_BASE: Record<EstadoDB, CorrespondenciaItem["estado"]> = {
  no_recibido: "No Recibido",
  en_porteria: "En Portería",
  entregado: "Entregado",
};

export const ESTADO_HACIA_BASE: Record<string, EstadoDB> = {
  "No Recibido": "no_recibido",
  "En Portería": "en_porteria",
  Entregado: "entregado",
};

const CATEGORIA_DESDE_BASE: Record<CategoriaDB, string> = {
  delivery: "Delivery",
  sobres: "Sobres",
  paqueteria: "Paquetería",
};

/**
 * La misma categoría se etiqueta distinto segun el rol: el guardia ve
 * "Delivery/Comida" y el resto "Delivery". Se aceptan las dos formas para que
 * la etiqueta visible no cambie el dato guardado.
 */
export const CATEGORIA_HACIA_BASE: Record<string, CategoriaDB> = {
  Delivery: "delivery",
  "Delivery/Comida": "delivery",
  Sobres: "sobres",
  "Paquetería": "paqueteria",
  Paqueteria: "paqueteria",
};

const CONDICION_DESDE_BASE: Record<CondicionDB, string> = {
  buen_estado: "Buen estado",
  estado_intermedio: "Estado intermedio",
  mal_estado: "Mal estado",
};

export const CONDICION_HACIA_BASE: Record<string, CondicionDB> = {
  "Buen estado": "buen_estado",
  "Estado intermedio": "estado_intermedio",
  "Mal estado": "mal_estado",
};

function nombreDe(perfil: any): string | undefined {
  if (!perfil) return undefined;
  const p = Array.isArray(perfil) ? perfil[0] : perfil;
  if (!p) return undefined;
  return `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || undefined;
}

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function mapear(fila: any): CorrespondenciaItem {
  const registrada = fila.registrada_en ? new Date(fila.registrada_en) : null;
  const recibida = fila.recibida_en ? new Date(fila.recibida_en) : null;
  const entregada = fila.entregada_en ? new Date(fila.entregada_en) : null;
  const incidencia = (fila.incidencias ?? [])[0];

  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    empresa: fila.empresa ?? "",
    unidad: fila.unidad?.codigo ?? "",
    unidadId: fila.unidad?.id ?? undefined,
    nombre: fila.destinatario_nombre ?? "",
    ci: fila.destinatario_documento ?? "",
    estado: ESTADO_DESDE_BASE[fila.estado as EstadoDB],
    fecha: registrada ? formatDate(registrada) : "",
    categoria: CATEGORIA_DESDE_BASE[fila.categoria as CategoriaDB] ?? "",
    logistica: fila.logistica ?? "",
    descripcion: fila.descripcion ?? "",
    entregaEnPuerta: fila.entrega_en_puerta ?? false,
    torre: fila.unidad?.torre?.numero ? `Torre ${fila.unidad.torre.numero}` : "",
    piso: fila.unidad?.piso != null ? String(fila.unidad.piso) : "",
    estadoEncomienda: fila.condicion
      ? CONDICION_DESDE_BASE[fila.condicion as CondicionDB]
      : "",
    fechaRegistro: registrada ? formatDate(registrada) : undefined,
    horaRegistro: registrada ? formatTime(registrada) : undefined,
    registradoPor: nombreDe(fila.registrada_por),
    fechaRecibido: recibida ? formatDate(recibida) : undefined,
    horaRecibido: recibida ? formatTime(recibida) : undefined,
    recibidoPor: nombreDe(fila.recibida_por),
    fechaEntregado: entregada ? formatDate(entregada) : undefined,
    horaEntregado: entregada ? formatTime(entregada) : undefined,
    entregadoA: fila.entregada_a ?? undefined,
    informarInfo: incidencia
      ? {
          descripcion: incidencia.descripcion,
          fotos: incidencia.fotos ?? [],
          fechaReporte: incidencia.reportada_en
            ? formatDate(new Date(incidencia.reportada_en))
            : "",
          usuarioReporte: "",
        }
      : undefined,
  };
}

export async function obtenerCorrespondencia(): Promise<CorrespondenciaItem[]> {
  const { data, error } = await supabase
    .from("correspondencia")
    .select(SELECT)
    .is("deleted_at", null)
    .order("registrada_en", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapear);
}

export interface NuevaCorrespondencia {
  condominioId: string;
  unidadId: string;
  empresa?: string;
  logistica?: string;
  categoria?: string;
  descripcion?: string;
  condicion?: string;
  entregaEnPuerta?: boolean;
  destinatarioNombre?: string;
  destinatarioDocumento?: string;
  estado?: CorrespondenciaItem["estado"];
}

export async function crearCorrespondencia(datos: NuevaCorrespondencia) {
  const { data, error } = await supabase
    .from("correspondencia")
    .insert({
      condominio_id: datos.condominioId,
      unidad_id: datos.unidadId,
      empresa: datos.empresa || null,
      logistica: datos.logistica || null,
      categoria: datos.categoria ? CATEGORIA_HACIA_BASE[datos.categoria] : null,
      descripcion: datos.descripcion || null,
      condicion: datos.condicion ? CONDICION_HACIA_BASE[datos.condicion] : null,
      entrega_en_puerta: datos.entregaEnPuerta ?? false,
      destinatario_nombre: datos.destinatarioNombre || null,
      destinatario_documento: datos.destinatarioDocumento || null,
      estado: datos.estado ? ESTADO_HACIA_BASE[datos.estado] : "en_porteria",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Cada cambio de estado deja su marca de tiempo y su actor. La base completa el
 * actor sola en el alta; para recepción y entrega se registra explícitamente.
 */
export async function cambiarEstadoCorrespondencia(
  uuid: string,
  estado: CorrespondenciaItem["estado"],
  extras?: { entregadoA?: string },
) {
  const { data: sesion } = await supabase.auth.getSession();
  const ahora = new Date().toISOString();
  const estadoDB = ESTADO_HACIA_BASE[estado];

  const { error } = await supabase
    .from("correspondencia")
    .update({
      estado: estadoDB,
      ...(estadoDB === "en_porteria"
        ? {
            recibida_en: ahora,
            recibida_por: sesion.session?.user.id ?? null,
          }
        : {}),
      ...(estadoDB === "entregado"
        ? {
            entregada_en: ahora,
            ...(extras?.entregadoA ? { entregada_a: extras.entregadoA } : {}),
          }
        : {}),
    })
    .eq("id", uuid);
  if (error) throw error;
}

/** Borrado lógico: el historial de portería no se pierde. */
export async function eliminarCorrespondencia(uuid: string) {
  const { error } = await supabase
    .from("correspondencia")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", uuid);
  if (error) throw error;
}

export async function reportarIncidencia(
  correspondenciaUuid: string,
  descripcion: string,
  fotos: string[] = [],
) {
  const { error } = await supabase.from("incidencia_correspondencia").insert({
    correspondencia_id: correspondenciaUuid,
    descripcion,
    fotos,
  });
  if (error) throw error;
}
