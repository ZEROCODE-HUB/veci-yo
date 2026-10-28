/**
 * La llamada entrante en iPhone con CallKit y PushKit (28/10/2026).
 *
 * ESCRITO Y SIN COMPILAR. Desde este equipo (Windows) no se puede compilar
 * para iPhone. El código nativo está en `modules/veciyo-llamadas` (Swift, se
 * enlaza solo); este archivo solo añade al Info.plist los modos en segundo
 * plano que CallKit y la voz necesitan.
 *
 * Lo que falta para encenderlo, y no es código:
 *   1. Cuenta de desarrollador de Apple (99 USD al año).
 *   2. En developer.apple.com, en el identificador com.veciyo.app, activar
 *      «Push Notifications».
 *   3. Crear una llave «Apple Push Notifications service (APNs)» (.p8) y poner
 *      en los secretos de las funciones de Supabase: APNS_TEAM_ID,
 *      APNS_KEY_ID, APNS_LLAVE_P8 (el contenido del .p8) y APNS_TOPIC_VOIP =
 *      com.veciyo.app.voip. Sirve también para los avisos normales en
 *      OneSignal (la misma llave).
 *   4. Compilar con EAS Build (o una Mac con Xcode), corregir lo que el
 *      compilador diga e instalar en un iPhone de verdad: PushKit no funciona
 *      en el simulador.
 *   5. Probarlo: con la app cerrada y el iPhone bloqueado, llamar desde otro
 *      equipo. Tiene que salir la pantalla de llamada del iPhone.
 *
 * Mientras tanto el iPhone recibe la llamada como aviso («X te llama») por
 * OneSignal, que es el nivel 1.
 */
const { withInfoPlist } = require("expo/config-plugins");

function withLlamadaEntranteIos(config) {
  return withInfoPlist(config, (cfg) => {
    const modos = new Set(cfg.modResults.UIBackgroundModes ?? []);
    modos.add("remote-notification");
    modos.add("voip");
    modos.add("audio");
    cfg.modResults.UIBackgroundModes = [...modos];
    return cfg;
  });
}

module.exports = { withLlamadaEntranteIos };
