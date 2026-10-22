/**
 * onesignal · armar el push de un aviso y leer lo que responde OneSignal
 *
 * Puro, sin red, para poder probarlo desde la suite de la app (igual que
 * `tusdatos.ts` y `tra.ts`). Lo usa la función `enviar-push`.
 *
 * A quién va: el `external_id` de OneSignal es el id de la cuenta en Supabase.
 * La app lo fija al entrar (`OneSignal.login`) y lo quita al salir, así que un
 * celular solo recibe los avisos de quien tiene la sesión abierta en él.
 */

export const URL_ONESIGNAL = "https://api.onesignal.com/notifications?c=push";

export interface AvisoParaPush {
  id: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidadTipo: string | null;
  entidadId: string | null;
}

/** El cuerpo de la petición a OneSignal. */
export function armarPush(aviso: AvisoParaPush, appId: string) {
  return {
    app_id: appId,
    target_channel: "push",
    include_aliases: { external_id: [aviso.usuarioId] },
    // OneSignal exige `en`; la app está en español, así que van los dos iguales.
    headings: { en: aviso.titulo, es: aviso.titulo },
    contents: { en: aviso.mensaje, es: aviso.mensaje },
    // Lo que la app necesita al recibirlo: marcarlo como recibido y saber a
    // dónde llevar a quien lo toca.
    data: {
      notificacionId: aviso.id,
      tipo: aviso.tipo,
      entidadTipo: aviso.entidadTipo,
      entidadId: aviso.entidadId,
    },
  };
}

export type ResultadoPush =
  | { estado: "enviado"; onesignalId: string; detalle: string | null }
  | { estado: "sin_dispositivo"; onesignalId: null; detalle: string }
  | { estado: "error"; onesignalId: null; detalle: string };

/**
 * En qué quedó el envío según la respuesta de OneSignal.
 *
 * OneSignal responde **200 aunque no le llegue a nadie**: el `id` viene vacío y
 * el motivo en `errors`. Si la persona no tiene ningún celular registrado, eso
 * no es un fallo de la plataforma sino un hecho que hay que poder ver
 * («sin_dispositivo»), distinto de una clave mala o un OneSignal caído.
 */
export function leerRespuestaOneSignal(status: number, cuerpo: unknown): ResultadoPush {
  const texto = typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo ?? null);

  if (status < 200 || status >= 300) {
    return { estado: "error", onesignalId: null, detalle: `OneSignal respondió ${status}: ${texto}` };
  }

  const datos = (typeof cuerpo === "object" && cuerpo !== null ? cuerpo : {}) as {
    id?: unknown;
    errors?: unknown;
  };
  const id = typeof datos.id === "string" ? datos.id : "";

  if (id) {
    // Salió, pero puede traer avisos para algún destinatario: se guardan.
    return { estado: "enviado", onesignalId: id, detalle: datos.errors ? JSON.stringify(datos.errors) : null };
  }

  const errores = JSON.stringify(datos.errors ?? null);
  if (/not subscribed|invalid_aliases|invalid_external_user_ids|no subscribers/i.test(errores)) {
    return {
      estado: "sin_dispositivo",
      onesignalId: null,
      detalle: "La persona no tiene ningún celular registrado para recibir avisos",
    };
  }

  return { estado: "error", onesignalId: null, detalle: `OneSignal no lo envió: ${texto}` };
}
