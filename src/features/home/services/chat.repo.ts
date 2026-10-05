import { supabase } from "@/shared/services/supabase";
import { formatDate, formatTime } from "@/shared/utils";
import type { Conversation, MensajeChat } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";

type AreaConversacion = Database["public"]["Enums"]["area_conversacion"];
type AmbitoGrupo = Database["public"]["Enums"]["ambito_grupo"];

/**
 * Chat.
 *
 * Los mensajes se agrupaban por el nombre de la otra persona y `leido` era un
 * booleano compartido. Ahora cada conversación es una fila y hasta dónde leyó
 * cada quien vive en `participante_conversacion` (migración 20260922140000).
 */

/** El emoji es presentación; lo decide el tipo de conversación. */
const EMOJI_AREA: Record<AreaConversacion, string> = {
  seguridad: "👮",
  administracion: "🛡️",
};

const EMOJI_AMBITO: Record<AmbitoGrupo, string> = {
  residentes: "🏘️",
  propietarios: "🏠",
};

const NOMBRE_AREA: Record<AreaConversacion, string> = {
  seguridad: "Seguridad",
  administracion: "Administración",
};

const EMOJI_DIRECTA = "💬";

export async function obtenerConversaciones(params: {
  usuarioId: string;
  /**
   * Si se consulta con rol de portería o administración. La política mira la
   * identidad, no el rol activo, así que quien administra el condominio y
   * además vive en él veía los hilos de portería de sus vecinos mientras
   * operaba como propietario (regla 8 de AGENTS.md).
   */
  comoPersonal: boolean;
  /** Unidades propias; con ellas se limita el ámbito cuando no es personal. */
  unidadIds: string[];
}): Promise<Conversation[]> {
  const { usuarioId } = params;

  let consulta = supabase
    .from("conversacion")
    .select(
      `id, tipo, area, ambito, nombre,
       unidad:unidad_id ( codigo ),
       participantes:participante_conversacion ( usuario_id, ultimo_leido_en ),
       mensajes:mensaje ( id, texto, enviado_en, autor_id, autor_nombre )`,
    )
    .is("mensajes.deleted_at", null);

  if (!params.comoPersonal) {
    // Los grupos y las directas no llevan unidad; los hilos de área, sí, y
    // entonces solo interesan los de las viviendas propias.
    const unidades = params.unidadIds.length
      ? `unidad_id.in.(${params.unidadIds.join(",")})`
      : "unidad_id.is.null";
    consulta = consulta.or(`tipo.neq.area,${unidades}`);
  }

  const { data, error } = await consulta;

  if (error) throw error;

  return (data ?? [])
    .map((fila) => {
      const mensajes = [...(fila.mensajes ?? [])].sort(
        (a, b) => +new Date(a.enviado_en) - +new Date(b.enviado_en),
      );
      const ultimo = mensajes[mensajes.length - 1];

      const propio = (fila.participantes ?? []).find(
        (p) => p.usuario_id === usuarioId,
      );
      const leidoHasta = propio?.ultimo_leido_en
        ? new Date(propio.ultimo_leido_en)
        : null;

      // Sin marca de lectura, todo lo ajeno cuenta como no leído.
      const noLeidos = mensajes.filter(
        (m) =>
          m.autor_id !== usuarioId &&
          (!leidoHasta || new Date(m.enviado_en) > leidoHasta),
      ).length;

      const nombre =
        fila.tipo === "area"
          ? NOMBRE_AREA[fila.area as AreaConversacion]
          : (fila.nombre ?? ultimo?.autor_nombre ?? "Conversación");

      return {
        id: fila.id,
        tipo: fila.tipo === "grupo" ? "grupo" : "individual",
        nombre:
          // La portería habla con viviendas, no con nombres sueltos.
          fila.tipo === "area" && fila.unidad?.codigo
            ? `${nombre} · Dpto ${fila.unidad.codigo}`
            : nombre,
        ultimoMensaje: ultimo?.texto ?? "",
        ultimaHora: ultimo ? formatTime(new Date(ultimo.enviado_en)) : "",
        ultimaFecha: ultimo ? formatDate(new Date(ultimo.enviado_en)) : "",
        avatarEmoji:
          fila.tipo === "area"
            ? EMOJI_AREA[fila.area as AreaConversacion]
            : fila.tipo === "grupo"
              ? EMOJI_AMBITO[fila.ambito as AmbitoGrupo]
              : EMOJI_DIRECTA,
        noLeidos,
        grupoId: fila.tipo === "grupo" ? fila.id : undefined,
        ultimoEnviadoEn: ultimo?.enviado_en ?? null,
      } as Conversation;
    })
    // Las más recientes arriba; las vacías al final.
    .sort((a, b) =>
      (b.ultimoEnviadoEn ?? "").localeCompare(a.ultimoEnviadoEn ?? ""),
    );
}

export async function obtenerMensajes(
  conversacionId: string,
  usuarioId: string,
): Promise<MensajeChat[]> {
  const { data, error } = await supabase
    .from("mensaje")
    .select("id, texto, enviado_en, autor_id, autor_nombre, autor_unidad")
    .eq("conversacion_id", conversacionId)
    .is("deleted_at", null)
    .order("enviado_en");

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    de: fila.autor_nombre,
    // La burbuja se pinta a un lado u otro según quién escribió. Esto iba
    // dentro de `de` como el literal "yo", y en los grupos ese "yo" salía
    // escrito como el nombre del autor.
    esMio: fila.autor_id === usuarioId,
    texto: fila.texto,
    hora: formatTime(new Date(fila.enviado_en)),
    fecha: formatDate(new Date(fila.enviado_en)),
    leido: true,
    persona: fila.autor_nombre,
    unidad: fila.autor_unidad,
  }));
}

export async function enviarMensaje(params: {
  conversacionId: string;
  texto: string;
  usuarioId: string;
  nombre: string;
}) {
  const { error } = await supabase.from("mensaje").insert({
    conversacion_id: params.conversacionId,
    autor_id: params.usuarioId,
    autor_nombre: params.nombre,
    texto: params.texto.trim(),
  });

  if (error) throw error;
}

/**
 * Marca hasta dónde leyó esta persona.
 *
 * `upsert` sobre (conversacion_id, usuario_id): la fila de participante se
 * crea al entrar por primera vez. En las conversaciones de área y en los
 * grupos la pertenencia la da el rol, así que la fila existe solo para esto.
 */
export async function marcarLeida(params: {
  conversacionId: string;
  usuarioId: string;
}) {
  const { error } = await supabase
    .from("participante_conversacion")
    .upsert(
      {
        conversacion_id: params.conversacionId,
        usuario_id: params.usuarioId,
        ultimo_leido_en: new Date().toISOString(),
      },
      { onConflict: "conversacion_id,usuario_id" },
    );

  if (error) throw error;
}

/**
 * Abre —o recupera— la conversación de una vivienda con un área.
 *
 * `conversacion_area_unica` garantiza que no haya dos hilos con la portería
 * para la misma unidad, así que se busca antes de insertar.
 */
export async function abrirConversacionArea(params: {
  condominioId: string;
  unidadId: string;
  area: AreaConversacion;
  usuarioId: string;
}): Promise<string> {
  const { data: existente, error: errorBusqueda } = await supabase
    .from("conversacion")
    .select("id")
    .eq("tipo", "area")
    .eq("unidad_id", params.unidadId)
    .eq("area", params.area)
    .maybeSingle();

  if (errorBusqueda) throw errorBusqueda;
  if (existente) return existente.id;

  const { data, error } = await supabase
    .from("conversacion")
    .insert({
      condominio_id: params.condominioId,
      tipo: "area",
      area: params.area,
      unidad_id: params.unidadId,
      creada_por: params.usuarioId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export interface LlamadaHistorial {
  id: string;
  tipo: "entrante" | "saliente" | "perdida";
  contacto: string;
  duracion: string;
  hora: string;
  fecha: string;
}

/** mm:ss a partir de los segundos que guarda la base. */
function formatearDuracion(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export async function obtenerHistorialLlamadas(): Promise<LlamadaHistorial[]> {
  // `llamada_propia` ya limita a las llamadas en las que se participó.
  const { data, error } = await supabase
    .from("llamada")
    .select("id, tipo, a_nombre, duracion_segundos, iniciada_en")
    .order("iniciada_en", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    contacto: fila.a_nombre,
    duracion: formatearDuracion(fila.duracion_segundos),
    hora: formatTime(new Date(fila.iniciada_en)),
    fecha: formatDate(new Date(fila.iniciada_en)),
  }));
}

export async function registrarLlamada(params: {
  condominioId: string;
  usuarioId: string;
  aNombre: string;
  aUsuarioId?: string | null;
  unidadId?: string | null;
  tipo?: "entrante" | "saliente" | "perdida";
  duracionSegundos?: number;
}) {
  const { error } = await supabase.from("llamada").insert({
    condominio_id: params.condominioId,
    de_usuario: params.usuarioId,
    a_usuario: params.aUsuarioId ?? null,
    a_nombre: params.aNombre,
    unidad_id: params.unidadId ?? null,
    tipo: params.tipo ?? "saliente",
    duracion_segundos: params.duracionSegundos ?? 0,
  });

  if (error) throw error;
}

/**
 * Marca como leídas todas las conversaciones visibles.
 *
 * Una fila de participante por conversación: la lectura es de cada persona.
 */
export async function marcarTodasLeidas(params: {
  conversacionIds: string[];
  usuarioId: string;
}) {
  if (params.conversacionIds.length === 0) return;

  const ahora = new Date().toISOString();
  const { error } = await supabase.from("participante_conversacion").upsert(
    params.conversacionIds.map((id) => ({
      conversacion_id: id,
      usuario_id: params.usuarioId,
      ultimo_leido_en: ahora,
    })),
    { onConflict: "conversacion_id,usuario_id" },
  );

  if (error) throw error;
}

/**
 * Quién está de turno ahora mismo en la portería.
 *
 * Lo decide la base (`guardias_de_turno`), no el cliente. La versión anterior
 * comparaba los turnos contra la hora del teléfono e **ignoraba los ajustes
 * puntuales**: un guardia con el día libre marcado seguía apareciendo de
 * turno. Ahora la hora es la local del condominio y el override manda.
 */
export async function obtenerGuardiasDeTurno(
  condominioId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("guardias_de_turno", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;

  const ids = (data ?? []).map((fila) => fila.usuario_id);
  if (ids.length === 0) return [];

  const { data: nombres, error: errorNombres } = await supabase
    .from("membresia_condominio")
    .select("nombre")
    .eq("condominio_id", condominioId)
    .in("usuario_id", ids);

  if (errorNombres) throw errorNombres;
  return (nombres ?? [])
    .map((fila) => fila.nombre)
    .filter((nombre): nombre is string => Boolean(nombre));
}
