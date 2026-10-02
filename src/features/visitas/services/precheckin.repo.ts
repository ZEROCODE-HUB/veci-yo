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

  /*
    A quien se le manda. Al abrir el preregistro **todavia no hay correo del
    huesped**: lo rellena el propio huesped al hacerlo, y al crear la visita el
    anfitrion solo pone el nombre. Por eso la pantalla enseña el enlace para
    compartirlo, que es como funciona hoy.

    Si algun dia el formulario de la visita pide el correo del huesped, se pasa
    aqui y sale solo. Anotado en REVISAR-A-OJO.
  */
  const destinatario = await correoDelTitular(visitaUuid);
  if (!destinatario) {
    console.log(`[precheckin] sin correo del huesped. Enlace: ${enlace}`);
    return { enlace, correoEnviado: false };
  }

  const { error: errorEnvio } = await supabase.functions.invoke("enviar-correo", {
    body: {
      tipo: "precheckin",
      correo: destinatario.correo,
      nombre: destinatario.nombre,
      enlace,
    },
  });
  if (errorEnvio) throw errorEnvio;

  return { enlace, correoEnviado: true };
}

/**
 * El correo y el nombre de quien encabeza una visita.
 *
 * Esta en `invitado`, en la fila del titular, y lo escribe el propio huesped al
 * hacer el preregistro. Antes de eso viene vacio, y eso no es un fallo: el
 * anfitrion no lo pide al reservar.
 */
async function correoDelTitular(
  visitaUuid: string,
): Promise<{ correo: string; nombre: string } | null> {
  const { data } = await supabase
    .from("invitado")
    .select("correo, nombre")
    .eq("visita_id", visitaUuid)
    .eq("es_titular", true)
    .maybeSingle();

  const correo = data?.correo?.trim();
  return correo ? { correo, nombre: data?.nombre ?? "" } : null;
}

/*
  Aqui vivian cuatro funciones del flujo del huesped --`consultarPrecheckin`,
  `guardarPrecheckin`, `aceptarTerminosPrecheckin` y `cerrarPrecheckin`-- y
  eran una **copia** de las de la web.

  La copia no la ejecutaba nadie en produccion: el huesped recorre el
  preregistro en la web, sin cuenta, con el enlace que le llego. Lo unico que
  la corria eran las pruebas, asi que lo que se probaba no era lo que se usaba.
  Y ya habian divergido dos veces sin que nada lo dijera: la fecha de
  nacimiento que una mandaba y la otra no, y el dominio del enlace final, que
  una sacaba de la configuracion y la otra del navegador.

  Unificado el 02/10/2026 (REVISAR-A-OJO 63): la implementacion vive en
  `veciyo-web/src/lib/precheckin.ts`, acepta el cliente por parametro, y los
  recorridos de este repositorio llaman a **esa**. Lo que se prueba es lo que
  el huesped ejecuta.

  Lo que se queda aqui es lo que solo hace la aplicacion: abrir el preregistro
  y reemitir el acceso, que son cosas del anfitrion, no del huesped.
*/

/**
 * Vuelve a emitir el acceso del huésped.
 *
 * Existe porque la demo del 25/09/2026 se quedó atascada aquí: el acceso se
 * enseña una sola vez al cerrar el preregistro, quien lo vio cerró la pantalla
 * sin copiarlo, y no había forma de recuperarlo. Ni el huésped podía entrar ni
 * el anfitrión reenviárselo; hubo que emitirlo a mano contra la base.
 *
 * Se reemite sobre la invitación que ya existe, no se crea otra: dos
 * invitaciones vivas para una estancia son dos llaves.
 */
export async function reemitirAccesoHuesped(
  visitaUuid: string,
): Promise<EnlacePrecheckin> {
  const { data, error } = await supabase.rpc("reemitir_acceso_huesped", {
    p_visita_id: visitaUuid,
  });
  if (error) throw error;

  const enlace = `${BASE_ENLACE}/invitacion?token=${data as string}`;

  if (!ENVIO_CORREO_ACTIVO) {
    console.log(`[precheckin] acceso reemitido: ${enlace}`);
    return { enlace, correoEnviado: false };
  }

  /*
    Aqui si hay correo: reemitir el acceso es algo que pasa **despues** del
    preregistro, y el huesped ya puso el suyo. Si aun asi falta, se devuelve el
    enlace para que el anfitrion se lo pase como pueda, que es mejor que un
    error.
  */
  const destinatario = await correoDelTitular(visitaUuid);
  if (!destinatario) {
    console.log(`[precheckin] sin correo del huesped. Acceso: ${enlace}`);
    return { enlace, correoEnviado: false };
  }

  const { error: errorEnvio } = await supabase.functions.invoke("enviar-correo", {
    body: {
      tipo: "acceso-huesped",
      correo: destinatario.correo,
      nombre: destinatario.nombre,
      enlace,
    },
  });
  if (errorEnvio) throw errorEnvio;

  return { enlace, correoEnviado: true };
}
