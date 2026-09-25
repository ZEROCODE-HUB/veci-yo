// Se importa por el alias `@/`, como el resto del codigo, y no con ruta
// relativa: las pruebas de recorrido sustituyen ese modulo por un cliente
// sin React Native, y un `./supabase` se les escapa.
import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

type AmbitoInvitacion = Database["public"]["Enums"]["ambito_invitacion"];
type RolUnidad = Database["public"]["Enums"]["rol_unidad"];
type RolCondominio = Database["public"]["Enums"]["rol_condominio"];

/**
 * Envío real del correo de invitación.
 *
 * Está APAGADO a propósito durante el desarrollo: sin acceso a la bandeja de
 * entrada no habría forma de recuperar el enlace y el flujo quedaría imposible
 * de probar. Con la bandera apagada, `crearInvitacion` devuelve el enlace para
 * que la app lo muestre y se pueda copiar a mano.
 *
 * Antes de producción hay que:
 *   1. Contratar el proveedor de correo y guardar su clave como secreto de
 *      Supabase — nunca como `EXPO_PUBLIC_*`, que se empaqueta en la app.
 *   2. Implementar el transporte en la Edge Function `enviar-invitacion`.
 *   3. Encender esta bandera y dejar de devolver el enlace a la UI.
 */
export const ENVIO_CORREO_ACTIVO =
  process.env.EXPO_PUBLIC_INVITACIONES_EMAIL === "true";

/**
 * La raíz de cualquier enlace que se le pasa a alguien de fuera.
 *
 * Se exporta para que el precheckin del huésped use **esta** y no una
 * copia: dos sitios calculando la misma dirección con criterios distintos
 * es el defecto que más veces ha salido en este proyecto.
 */
export const BASE_ENLACE =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://veciyo-web.vercel.app";

export interface NuevaInvitacionUnidad {
  ambito: "unidad";
  condominioId: string;
  unidadId: string;
  rol: RolUnidad;
  correo: string;
  nombre: string;
  /**
   * Fechas de la estancia, en ISO (`yyyy-MM-dd`).
   *
   * **Obligatorias si `rol` es `huesped_temporal`**: la membresía de un huésped
   * no puede existir sin fecha de salida, y la invitación es el único camino
   * por el que la app crea membresías. Sin ellas el alta se aceptaba y
   * reventaba contra la restricción en la cara de quien pulsaba el enlace.
   */
  vigenteDesde?: string;
  vigenteHasta?: string;
}

export interface NuevaInvitacionCondominio {
  ambito: "condominio";
  condominioId: string;
  rol: RolCondominio;
  correo: string;
  nombre: string;
}

export type NuevaInvitacion = (
  | NuevaInvitacionUnidad
  | NuevaInvitacionCondominio
) & {
  /**
   * A quién llamar si le pasa algo a esta persona.
   *
   * Viaja con la invitación y la base lo copia a la membresía al aceptarla:
   * hasta entonces no hay membresía donde ponerlo, y es justamente algo que
   * quien invita sabe y la persona invitada puede no poner.
   */
  contactoEmergencia?: {
    nombre?: string;
    codigo?: string;
    telefono?: string;
  };
};

export interface InvitacionCreada {
  invitacionId: string;
  /** Solo mientras el envío de correo esté apagado. */
  enlace: string | null;
  correoEnviado: boolean;
}

export async function crearInvitacion(
  datos: NuevaInvitacion,
): Promise<InvitacionCreada> {
  const { data, error } = await supabase.rpc("crear_invitacion", {
    p_condominio_id: datos.condominioId,
    p_ambito: datos.ambito as AmbitoInvitacion,
    p_correo: datos.correo,
    p_nombre: datos.nombre,
    p_unidad_id: datos.ambito === "unidad" ? datos.unidadId : undefined,
    p_rol_unidad: datos.ambito === "unidad" ? datos.rol : undefined,
    p_rol_condominio: datos.ambito === "condominio" ? datos.rol : undefined,
    p_vigente_desde: datos.ambito === "unidad" ? datos.vigenteDesde : undefined,
    p_vigente_hasta: datos.ambito === "unidad" ? datos.vigenteHasta : undefined,
    p_contacto_nombre: datos.contactoEmergencia?.nombre || undefined,
    p_contacto_codigo: datos.contactoEmergencia?.codigo || undefined,
    p_contacto_telefono: datos.contactoEmergencia?.telefono || undefined,
  });

  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  const token = fila?.token as string;
  const invitacionId = fila?.invitacion_id as string;
  const enlace = `${BASE_ENLACE}/invitacion?token=${token}`;

  if (!ENVIO_CORREO_ACTIVO) {
    // Sin este registro el flujo no se puede recorrer en desarrollo.
    console.log(`[invitacion] envío de correo desactivado. Enlace: ${enlace}`);
    return { invitacionId, enlace, correoEnviado: false };
  }

  const { error: errorEnvio } = await supabase.functions.invoke(
    "enviar-invitacion",
    { body: { invitacionId, correo: datos.correo, nombre: datos.nombre, enlace } },
  );
  if (errorEnvio) throw errorEnvio;

  await supabase
    .from("invitacion")
    .update({ enviada_en: new Date().toISOString() })
    .eq("id", invitacionId);

  // Con el envío activo el enlace no vuelve a la UI: vive solo en el correo.
  return { invitacionId, enlace: null, correoEnviado: true };
}

export interface DetalleInvitacion {
  condominio: string;
  unidad: string | null;
  rol: string;
  correo: string;
  nombre: string;
  expiraEn: string;
  vigente: boolean;
}

/** Se puede consultar sin sesión: es lo que abre el enlace del correo. */
export async function consultarInvitacion(
  token: string,
): Promise<DetalleInvitacion | null> {
  const { data, error } = await supabase.rpc("consultar_invitacion", {
    p_token: token,
  });
  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) return null;

  return {
    condominio: fila.condominio,
    unidad: fila.unidad,
    rol: fila.rol,
    correo: fila.correo,
    nombre: fila.nombre,
    expiraEn: fila.expira_en,
    vigente: fila.vigente,
  };
}

/** Requiere sesión iniciada con el mismo correo al que se emitió la invitación. */
export async function aceptarInvitacion(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("aceptar_invitacion", {
    p_token: token,
  });
  if (error) throw error;
  return data as string;
}

export async function rechazarInvitacion(token: string): Promise<void> {
  const { error } = await supabase.rpc("rechazar_invitacion", {
    p_token: token,
  });
  if (error) throw error;
}

export async function listarInvitacionesPendientes(condominioId: string) {
  const { data, error } = await supabase
    .from("invitacion")
    .select("id, correo, nombre, ambito, rol_unidad, rol_condominio, estado, expira_en, enviada_en, unidad:unidad_id (codigo)")
    .eq("condominio_id", condominioId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
