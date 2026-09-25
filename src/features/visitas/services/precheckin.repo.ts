// Se importa por el alias `@/`, como el resto del codigo: las pruebas de
// recorrido sustituyen ese modulo por un cliente sin React Native.
import { supabase } from "@/shared/services/supabase";
import { BASE_ENLACE, ENVIO_CORREO_ACTIVO } from "@/shared/services/invitaciones";
import type { Database } from "@/shared/types/database.types";

/**
 * El precheckin del huésped.
 *
 * Es el trozo que faltaba para que «huésped temporal» fuera **una sola cosa**.
 * Hasta ahora había dos caminos que no se conocían entre sí (R-26): una
 * membresía nacida de una invitación por correo, que daba cuenta pero no
 * guardaba documento ni pasaba por TRA/SIRE, y un invitado de una visita, que
 * guardaba todo lo que la ley pide pero no daba acceso a nada.
 *
 * Aquí la estancia es la visita, y el enlace de precheckin es lo que la une
 * con la persona: el anfitrión lo abre, el huésped lo rellena, y de ahí sale
 * su cuenta.
 *
 * Mientras el envío de correo esté apagado --ver `ENVIO_CORREO_ACTIVO`-- el
 * enlace vuelve a la pantalla para poder pasarlo a mano. Es la misma decisión
 * que en las invitaciones y por el mismo motivo: sin acceso a la bandeja de
 * entrada, el flujo sería imposible de recorrer.
 */

export interface EnlacePrecheckin {
  enlace: string;
  correoEnviado: boolean;
}

/**
 * Genera el enlace de una estancia y lo devuelve **una sola vez**.
 *
 * Volver a llamarla invalida el anterior: en la base solo vive el sha256, así
 * que el token en claro no se puede recuperar. Es a propósito —si se filtrara
 * la tabla no se filtraría el acceso—, y significa que la pantalla tiene que
 * enseñarlo cuando lo tiene.
 */
export async function abrirPrecheckin(
  visitaUuid: string,
): Promise<EnlacePrecheckin> {
  const { data, error } = await supabase.rpc("abrir_precheckin", {
    p_visita_id: visitaUuid,
  });
  if (error) throw error;

  /*
    `/access/:token`, no una ruta nueva: esa es la que la web pública ya
    tiene montada (`veciyo-web/src/App.tsx`), donde `Access.tsx` recoge el
    token y arranca el precheckin. Inventar otra dejaría dos puertas a lo
    mismo.
  */
  const enlace = `${BASE_ENLACE}/access/${data as string}`;

  if (!ENVIO_CORREO_ACTIVO) {
    // Sin este registro el flujo no se puede recorrer en desarrollo.
    console.log(`[precheckin] envío de correo desactivado. Enlace: ${enlace}`);
    return { enlace, correoEnviado: false };
  }

  const { error: errorEnvio } = await supabase.functions.invoke(
    "enviar-invitacion",
    { body: { tipo: "precheckin", enlace } },
  );
  if (errorEnvio) throw errorEnvio;

  return { enlace, correoEnviado: true };
}

export interface DetallePrecheckin {
  visitaUuid: string;
  condominio: string;
  unidad: string;
  /** Nombre de pila del anfitrión: para reconocer de quién es el enlace. */
  anfitrion: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  /** Tope de personas de la ficha del alojamiento; null si no hay ficha. */
  maxHuespedes: number | null;
  vigente: boolean;
  completado: boolean;
}

/**
 * Lo que ve quien abre el enlace **antes de identificarse**.
 *
 * Se consulta sin sesión, como `consultarInvitacion`. Devuelve lo justo para
 * reconocer la reserva y nada de los demás huéspedes: quien tenga el enlace no
 * tiene por qué saber quién más se aloja en esa vivienda.
 */
export async function consultarPrecheckin(
  token: string,
): Promise<DetallePrecheckin | null> {
  const { data, error } = await supabase.rpc("consultar_precheckin", {
    p_token: token,
  });
  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) return null;

  return {
    visitaUuid: fila.visita_id,
    condominio: fila.condominio,
    unidad: fila.unidad,
    anfitrion: fila.anfitrion,
    fechaDesde: fila.fecha_desde,
    fechaHasta: fila.fecha_hasta,
    maxHuespedes: fila.max_huespedes,
    vigente: fila.vigente,
    completado: fila.completado,
  };
}

/** Lo que el huésped escribe de sí mismo en el precheckin. */
export interface FichaPrecheckin {
  nombre: string;
  /*
    Obligatorio, y aparte del nombre: el documento los trae aparte y la
    pantalla los pide aparte. Juntarlos obliga a partir por el primer espacio,
    que es como se pierden los apellidos compuestos.
  */
  apellidos: string;
  tipoDocumento: Database["public"]["Enums"]["tipo_documento"];
  documento: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  motivo?: Database["public"]["Enums"]["motivo_estancia"];
  fechaNacimiento?: string;
}

/**
 * Guarda la ficha del titular. **Sin sesión**: la escribe quien tiene el
 * enlace, que todavía no tiene cuenta.
 *
 * Rellena la fila que el anfitrión dejó al reservar en vez de crear otra, así
 * que llamarla dos veces corrige los datos y no duplica a la persona.
 */
export async function guardarPrecheckin(
  token: string,
  ficha: FichaPrecheckin,
): Promise<string> {
  const { data, error } = await supabase.rpc("guardar_precheckin", {
    p_token: token,
    p_nombre: ficha.nombre,
    p_apellidos: ficha.apellidos,
    p_tipo_documento: ficha.tipoDocumento,
    p_documento: ficha.documento,
    p_correo: ficha.correo,
    p_telefono: ficha.telefono,
    p_direccion: ficha.direccion,
    p_motivo: ficha.motivo,
    p_fecha_nacimiento: ficha.fechaNacimiento,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Los acepta el propio huésped, y eso queda dicho: la columna que guarda
 * *quién* los aprobó se queda vacía a propósito. Solo se rellena cuando el
 * anfitrión los aprueba por excepción, que es otra cosa y se pinta distinto.
 */
export async function aceptarTerminosPrecheckin(token: string): Promise<void> {
  const { error } = await supabase.rpc("aceptar_terminos_precheckin", {
    p_token: token,
  });
  if (error) throw error;
}

/**
 * Cierra el preregistro y emite el acceso del titular a la aplicación.
 *
 * Aquí es donde dejan de ser dos cosas. Hasta ahora la estancia y la cuenta
 * nacían por caminos distintos, y podían no ser de la misma persona: en la
 * 102 había alguien reportado a la autoridad sin acceso, y alguien con acceso
 * sin reportar. Ahora la cuenta sale **de** la estancia, con sus fechas.
 *
 * Devuelve el enlace de esa invitación **una vez**, por el mismo motivo que
 * el del precheckin: en la base solo vive su sha256.
 */
export async function cerrarPrecheckin(
  token: string,
): Promise<EnlacePrecheckin> {
  const { data, error } = await supabase.rpc("cerrar_precheckin", {
    p_token: token,
  });
  if (error) throw error;

  const enlace = `${BASE_ENLACE}/invitacion?token=${data as string}`;

  if (!ENVIO_CORREO_ACTIVO) {
    console.log(`[precheckin] cerrado. Acceso del huésped: ${enlace}`);
    return { enlace, correoEnviado: false };
  }

  const { error: errorEnvio } = await supabase.functions.invoke(
    "enviar-invitacion",
    { body: { tipo: "acceso-huesped", enlace } },
  );
  if (errorEnvio) throw errorEnvio;

  return { enlace, correoEnviado: true };
}
