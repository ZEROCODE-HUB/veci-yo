import { supabase } from "@/shared/services/supabase";
import { formatDate } from "@/shared/utils";
import type { Database } from "@/shared/types/database.types";

type AreaReclamo = Database["public"]["Enums"]["area_reclamo"];
type TipoReclamo = Database["public"]["Enums"]["tipo_reclamo"];
type EstadoReclamo = Database["public"]["Enums"]["estado_reclamo"];
type DestinatarioReclamo = Database["public"]["Enums"]["destinatario_reclamo"];
type MedioContacto = Database["public"]["Enums"]["medio_contacto"];

/**
 * PQRS.
 *
 * Los ocho reclamos de ejemplo vivían en `soporteMockData` con un vocabulario
 * propio ("Consulta"/"Convivencia") que no coincidía ni con el schema ni con
 * el formulario. La migración 20260922100000 separó los tres ejes; aquí solo
 * se traduce entre las etiquetas que muestra la interfaz y los enums.
 */

export const AREAS: Record<AreaReclamo, string> = {
  condominio: "Condominio",
  aplicacion: "Aplicación VeciYo",
  constructora: "Constructora TyC",
  documentos_antiguos: "Documentos antiguos",
};

/** Los tipos que ofrece cada área. Las dos últimas no piden tipo. */
export const TIPOS_POR_AREA: Record<AreaReclamo, TipoReclamo[]> = {
  condominio: ["pregunta", "queja", "reclamo", "sugerencia"],
  aplicacion: ["idea", "soporte"],
  constructora: [],
  documentos_antiguos: [],
};

export const TIPOS: Record<TipoReclamo, string> = {
  pregunta: "Pregunta",
  queja: "Queja",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  consulta: "Consulta",
  idea: "Idea",
  soporte: "Soporte",
};

export const ESTADOS: Record<EstadoReclamo, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  resuelto: "Resuelto",
};

export const DESTINATARIOS: Record<DestinatarioReclamo, string> = {
  administrador: "Administrador",
  propietario: "Propietario",
  aplicacion: "Aplicación",
};

export const MEDIOS_CONTACTO: Record<MedioContacto, string> = {
  correo: "Correo electrónico",
  telefono: "Teléfono",
  cualquiera: "Cualquiera",
};

/** Busca la clave del enum a partir de la etiqueta que eligió la persona. */
function claveDe<T extends string>(
  mapa: Record<T, string>,
  etiqueta: string,
): T | null {
  const par = Object.entries(mapa).find(([, valor]) => valor === etiqueta);
  return par ? (par[0] as T) : null;
}

export interface Reclamo {
  id: string;
  numero: string;
  nombre: string;
  titulo: string;
  descripcion: string;
  area: string;
  tipo: string;
  estado: string;
  fechaCreacion: string;
  fechaRevision: string;
  resolucionAdmin?: string;
  modelo?: string;
}

export async function obtenerReclamos(): Promise<Reclamo[]> {
  const { data, error } = await supabase
    .from("reclamo")
    .select(
      `id, numero, titulo, descripcion, area, tipo, estado, resolucion,
       modelo_dispositivo, creado_por_nombre, created_at, resuelto_en`,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((fila: any) => ({
    id: fila.id,
    numero: fila.numero ?? "",
    nombre: fila.creado_por_nombre ?? "",
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    area: AREAS[fila.area as AreaReclamo] ?? fila.area,
    tipo: TIPOS[fila.tipo as TipoReclamo] ?? fila.tipo,
    estado: ESTADOS[fila.estado as EstadoReclamo] ?? fila.estado,
    fechaCreacion: formatDate(new Date(fila.created_at)),
    fechaRevision: fila.resuelto_en
      ? formatDate(new Date(fila.resuelto_en))
      : "",
    resolucionAdmin: fila.resolucion ?? undefined,
    modelo: fila.modelo_dispositivo ?? undefined,
  }));
}

export interface NuevoReclamo {
  titulo: string;
  descripcion: string;
  /** Etiquetas tal como las eligió la persona en los selectores. */
  area: string;
  tipo: string;
  destinatario: string;
  correo: string;
  telefono: string;
  medioContacto: string;
  modelo: string;
}

export async function crearReclamo(params: {
  datos: NuevoReclamo;
  condominioId: string;
  unidadId: string | null;
  usuarioId: string;
  nombre: string;
}) {
  const area = claveDe(AREAS, params.datos.area) ?? "condominio";

  const { data, error } = await supabase.from("reclamo").insert({
    condominio_id: params.condominioId,
    unidad_id: params.unidadId,
    creado_por: params.usuarioId,
    creado_por_nombre: params.nombre,
    titulo: params.datos.titulo.trim(),
    descripcion: params.datos.descripcion.trim(),
    area,
    // Las áreas sin tipos propios se registran como consulta.
    tipo: claveDe(TIPOS, params.datos.tipo) ?? "consulta",
    destinatario: claveDe(DESTINATARIOS, params.datos.destinatario),
    correo_contacto: params.datos.correo.trim() || null,
    telefono_contacto: params.datos.telefono.trim() || null,
    medio_contacto_preferido: claveDe(
      MEDIOS_CONTACTO,
      params.datos.medioContacto,
    ),
    // La restricción `reclamo_modelo_solo_para_app` rechaza el modelo en
    // cualquier otra área.
    modelo_dispositivo:
      area === "aplicacion" ? params.datos.modelo.trim() || null : null,
    // `numero` lo asigna la secuencia de la base: el cliente lo sorteaba con
    // `Math.random()` y podía repetirlo.
  })
    // Se devuelve la fila para que la pantalla de éxito muestre el número real
    // que asignó la base, y no uno adivinado antes de escribir.
    .select("numero, area")
    .single();

  if (error) throw error;

  return {
    numero: data.numero ?? "",
    area: AREAS[data.area as AreaReclamo] ?? data.area,
  };
}

export async function cambiarEstadoReclamo(params: {
  id: string;
  estado: string;
  resolucion?: string;
  usuarioId: string;
}) {
  const estado = claveDe(ESTADOS, params.estado) ?? "pendiente";
  const resuelto = estado === "resuelto";

  const { error } = await supabase
    .from("reclamo")
    .update({
      estado,
      resolucion: params.resolucion?.trim() || null,
      // La restricción `reclamo_resuelto_con_actor` exige ambos al resolver.
      resuelto_por: resuelto ? params.usuarioId : null,
      resuelto_en: resuelto ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) throw error;
}

export interface PreguntaFrecuente {
  id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
}

/**
 * Preguntas frecuentes del condominio.
 *
 * Eran siete entradas fijas en el cliente. Tres de ellas explicaban un sistema
 * de puntos —cómo sumarlos, que vencen a los 12 meses, que se canjean por
 * descuentos— que el producto no tiene: la decisión del 21/07/2026 fue
 * acumulación de insignias, sin niveles ni puntos. No se migran.
 */
export async function obtenerPreguntasFrecuentes(
  condominioId: string,
): Promise<PreguntaFrecuente[]> {
  const { data, error } = await supabase
    .from("pregunta_frecuente")
    .select("id, categoria, pregunta, respuesta")
    .eq("condominio_id", condominioId)
    .order("orden");

  if (error) throw error;
  return data ?? [];
}

export interface ContactoSoporte {
  telefono: string | null;
  email: string | null;
  ubicacion: string | null;
  horarios: string | null;
}

/**
 * Contacto de la administración.
 *
 * La pantalla mostraba un teléfono de Ecuador, una dirección de Perú y
 * "VeciYomanda@gmail.com". Son los datos del condominio.
 */
export async function obtenerContactoSoporte(
  condominioId: string,
): Promise<ContactoSoporte> {
  const { data, error } = await supabase
    .from("condominio")
    .select("telefono, email, direccion, ciudad, horario_atencion")
    .eq("id", condominioId)
    .maybeSingle();

  if (error) throw error;

  return {
    telefono: data?.telefono ?? null,
    email: data?.email ?? null,
    ubicacion: [data?.direccion, data?.ciudad].filter(Boolean).join(", ") || null,
    horarios: data?.horario_atencion ?? null,
  };
}
