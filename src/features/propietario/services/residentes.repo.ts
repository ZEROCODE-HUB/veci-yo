import { supabase } from "@/shared/services/supabase";
import { formatDate } from "@/shared/utils";
import type { Database } from "@/shared/types/database.types";

type RolUnidadDB = Database["public"]["Enums"]["rol_unidad"];

/**
 * Quién vive en una vivienda.
 *
 * La pantalla de Configuración mostraba **tres personas inventadas** —"Alberto
 * Manual", con la errata, y dos más con cédulas ficticias— escritas a mano en
 * `src/stores/propietario-store.ts`. En el condominio de prueba la 301 tiene
 * una sola residente, y la pantalla de Invitar sí lo decía bien.
 *
 * Sobre ese mismo store operaban también el anfitrión primario, el
 * administrador primario y la declaración de residencia del propietario. Todo
 * se perdía al recargar, y `es_residente` decide de verdad qué anuncios y qué
 * grupos de chat le llegan a cada quien.
 */

/** La app habla con etiquetas; la base con enums. */
const HACIA_ETIQUETA: Record<RolUnidadDB, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino Lider",
  residente: "Residente",
  corresidente: "Corresidente",
  coadministrador: "Coadministrador",
  huesped_temporal: "Huesped Temporal",
};

export interface ResidenteDeUnidad {
  /** El id de la membresía, que es lo que las acciones necesitan. */
  id: string;
  usuarioId: string | null;
  nombre: string;
  rol: string;
  /** Documento de identidad; vacío si la persona no lo tiene cargado. */
  ci: string;
  /** Fecha de alta en la vivienda, `dd/MM/yyyy`. */
  fecha: string;
  /**
   * La ventana de la estancia, `yyyy-MM-dd`, para los roles temporales.
   * Vacia en los permanentes: un propietario no caduca.
   */
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  telefono: string;
  esAnfitrionPrimario: boolean;
  esAdministradorPrimario: boolean;
  esResidente: boolean;
  esMenor: boolean;
  datosVisibles: boolean;
  contactableChat: boolean;
  contactableWhatsapp: boolean;
}

/*
  El perfil se lee aparte y no como relación anidada.
  `membresia_unidad.usuario_id` referencia `auth.users`, no `public.perfil`, así
  que PostgREST no sabe unirlas: `perfil:usuario_id (...)` devuelve PGRST200,
  "no matches were found". Lo cazó el barrido de consultas de la app en la
  primera corrida.
*/
const SELECT_RESIDENTE = `
  id, usuario_id, nombre, rol, telefono, created_at,
  es_anfitrion_primario, es_admin_primario, es_residente, es_menor,
  datos_visibles, contactable_chat, contactable_whatsapp,
  vigente_desde, vigente_hasta
`;

export async function obtenerResidentes(
  unidadId: string,
): Promise<ResidenteDeUnidad[]> {
  if (!unidadId) return [];

  const { data, error } = await supabase
    .from("membresia_unidad")
    .select(SELECT_RESIDENTE)
    .eq("unidad_id", unidadId)
    .eq("activo", true)
    .order("created_at");

  if (error) throw error;

  const conCuenta = (data ?? [])
    .map((fila: any) => fila.usuario_id)
    .filter(Boolean);

  const perfiles = new Map<string, any>();
  if (conCuenta.length > 0) {
    const { data: filas, error: errorPerfil } = await supabase
      .from("perfil")
      .select("id, nombre, apellido, identificacion, telefono")
      .in("id", conCuenta);
    if (errorPerfil) throw errorPerfil;
    for (const fila of filas ?? []) perfiles.set(fila.id, fila);
  }

  return (data ?? []).map((fila: any) => {
    const perfil = fila.usuario_id ? (perfiles.get(fila.usuario_id) ?? null) : null;
    // `membresia_unidad.nombre` es el nombre con que se registró a alguien que
    // todavía no tiene cuenta —un menor, una invitación sin aceptar—. Cuando
    // hay perfil, manda el perfil: es como esa persona se llama a sí misma.
    const delPerfil = [perfil?.nombre, perfil?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      id: fila.id,
      usuarioId: fila.usuario_id,
      nombre: delPerfil || fila.nombre || "Sin nombre",
      rol: HACIA_ETIQUETA[fila.rol as RolUnidadDB] ?? fila.rol,
      ci: perfil?.identificacion ?? "",
      fecha: fila.created_at ? formatDate(new Date(fila.created_at)) : "",
      vigenteDesde: fila.vigente_desde ?? null,
      vigenteHasta: fila.vigente_hasta ?? null,
      telefono: perfil?.telefono ?? fila.telefono ?? "",
      esAnfitrionPrimario: Boolean(fila.es_anfitrion_primario),
      esAdministradorPrimario: Boolean(fila.es_admin_primario),
      esResidente: Boolean(fila.es_residente),
      esMenor: Boolean(fila.es_menor),
      datosVisibles: Boolean(fila.datos_visibles),
      contactableChat: Boolean(fila.contactable_chat),
      contactableWhatsapp: Boolean(fila.contactable_whatsapp),
    };
  });
}

/**
 * Designa al anfitrión o al administrador primario.
 *
 * No es un `update` porque el índice único no admite dos a la vez: hay que
 * apagar al anterior en la misma operación, y eso lo hace la base.
 */
export async function designarPrimario(
  membresiaId: string,
  cual: "anfitrion" | "administrador",
): Promise<void> {
  const { error } = await supabase.rpc("designar_primario", {
    p_membresia_id: membresiaId,
    p_cual: cual,
  });
  if (error) throw error;
}

/**
 * El propietario declara si vive o no en su vivienda.
 *
 * Vivía en un mapa `correo -> boolean` en memoria, lo que además usaba el
 * correo como clave. Ahora es `es_residente`, que es lo que la base ya miraba
 * para decidir qué anuncios y qué grupos le llegan.
 */
export async function declararseResidente(
  unidadId: string,
  valor: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("declararse_residente", {
    p_unidad_id: unidadId,
    p_valor: valor,
  });
  if (error) throw error;
}

/** Lo que cada quien comparte con los demás de su vivienda. */
export async function cambiarVisibilidad(
  membresiaId: string,
  cambios: {
    datosVisibles?: boolean;
    contactableChat?: boolean;
    contactableWhatsapp?: boolean;
  },
): Promise<void> {
  const { error } = await supabase
    .from("membresia_unidad")
    .update({
      datos_visibles: cambios.datosVisibles,
      contactable_chat: cambios.contactableChat,
      contactable_whatsapp: cambios.contactableWhatsapp,
    })
    .eq("id", membresiaId);
  if (error) throw error;
}

/**
 * Da de baja a alguien de la vivienda.
 *
 * Se desactiva, no se borra: las visitas que registró, la correspondencia que
 * recibió y los mensajes que escribió siguen apuntando a esa membresía. Al
 * propietario no se le puede dar de baja desde aquí —lo impide
 * `proteger_membresia_unidad`—, porque la propiedad es un hecho legal que
 * registra la administración.
 */
export async function quitarDeLaVivienda(membresiaId: string): Promise<void> {
  const { error } = await supabase
    .from("membresia_unidad")
    .update({ activo: false })
    .eq("id", membresiaId);
  if (error) throw error;
}
