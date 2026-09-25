// Se importa por el alias `@/`, como el resto del codigo: las pruebas de
// recorrido sustituyen ese modulo por un cliente sin React Native.
import { supabase } from "@/shared/services/supabase";
import { BASE_ENLACE, ENVIO_CORREO_ACTIVO } from "@/shared/services/invitaciones";

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
