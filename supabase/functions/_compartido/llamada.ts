/**
 * llamada · los avisos al celular de una llamada por la app (28/10/2026)
 *
 * Puro, sin red, para poder probarlo desde la suite de la app (igual que
 * `onesignal.ts`). Lo usa la función `avisar-llamada`.
 *
 * Dos caminos:
 *   · **OneSignal** (Android, y el aviso del iPhone): `llamada_entrante` al
 *     empezar a sonar y `llamada_fin` al dejar de sonar, con el mismo
 *     `collapse_id`, así que el segundo sustituye al primero. En Android con
 *     el APK nuevo los dos los intercepta `LlamadaEntranteExtension` y no se
 *     ven como aviso: el primero se cambia por una llamada y el segundo la
 *     quita.
 *   · **Apple VoIP** (PushKit, iPhone con CallKit): solo al empezar a sonar.
 *     Apple exige que cada push VoIP acabe en una llamada de CallKit, así que
 *     el «ya no suena» lo resuelve la app, que está despierta.
 */

export type OrigenLlamada = "vivienda" | "porteria" | "administracion";

/** Quién llama, como lo lee quien recibe: «Administración», «Vivienda 102». */
export function deQuienLlama(
  origen: OrigenLlamada | null,
  codigoDeLaVivienda: string | null,
  /** Nombre y apellido de quien llama, si se sabe (29/10/2026). */
  nombre?: string | null,
): string {
  const real = origen ?? (codigoDeLaVivienda ? "vivienda" : "porteria");
  const lugar =
    real === "administracion"
      ? "Administración"
      : real === "porteria"
        ? "Portería"
        : `Vivienda ${codigoDeLaVivienda ?? ""}`.trim();
  return nombre?.trim() ? `${nombre.trim()} · ${lugar}` : lugar;
}

export function armarPushDeLlamada(datos: {
  appId: string;
  evento: "sonando" | "fin";
  llamadaId: string;
  deQuien: string;
  para: string[];
  segundos: number;
  /**
   * Para rechazar sin sesión (Android con la app cerrada): a quién va, la
   * firma de «llamada + persona» y dónde mandarla. Solo cuando el aviso va a
   * una sola persona: la firma es de cada una.
   */
  rechazo?: { usuarioId: string; firma: string; url: string };
}) {
  const sonando = datos.evento === "sonando";
  const titulo = datos.deQuien;
  const texto = sonando ? "Te llama por Veciyo" : "La llamada ya no está sonando";
  return {
    app_id: datos.appId,
    target_channel: "push",
    include_aliases: { external_id: datos.para },
    headings: { en: titulo, es: titulo },
    contents: { en: texto, es: texto },
    data: {
      tipo: sonando ? "llamada_entrante" : "llamada_fin",
      llamadaId: datos.llamadaId,
      deQuien: datos.deQuien,
      segundos: datos.segundos,
      ...(datos.rechazo
        ? {
            usuarioId: datos.rechazo.usuarioId,
            firma: datos.rechazo.firma,
            rechazarUrl: datos.rechazo.url,
          }
        : {}),
    },
    // Lo antes posible, y que no llegue tarde: pasado el tiempo ya no suena.
    priority: 10,
    ttl: datos.segundos,
    collapse_id: `llamada-${datos.llamadaId}`,
    ios_sound: sonando ? "default" : undefined,
    // OneSignal lo escribe con guion bajo; con guion medio respondía 400 y la
    // llamada no sonaba con la app cerrada (29/10/2026).
    ios_interruption_level: sonando ? "time_sensitive" : "passive",
  };
}

/** El cuerpo del push VoIP a Apple: lo que CallKit enseña y con qué se contesta. */
export function armarVoip(datos: { llamadaId: string; deQuien: string; segundos: number }) {
  return {
    aps: {},
    tipo: "llamada_entrante",
    llamadaId: datos.llamadaId,
    deQuien: datos.deQuien,
    segundos: datos.segundos,
  };
}
