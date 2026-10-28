/**
 * Plugin de Expo: la llamada entrante como una llamada de verdad (28/10/2026).
 *
 * Android (`./android`): con el celular bloqueado o la app cerrada, una
 * llamada por la app enciende la pantalla, suena con el tono del teléfono y
 * deja contestar o rechazar. Registra en el AndroidManifest:
 *   · la extensión de OneSignal que cambia el push «llamada_entrante» por una
 *     llamada (`LlamadaEntranteExtension`);
 *   · la pantalla de llamada sobre el bloqueo (`LlamadaActivity`);
 *   · el receptor de «Rechazar» (`RechazarLlamadaReceiver`);
 *   · el permiso de pantalla completa (`USE_FULL_SCREEN_INTENT`).
 *
 * iOS (`./ios.js`): CallKit y PushKit. Escrito y sin compilar: necesita la
 * cuenta de desarrollador de Apple. Ver la cabecera de ese archivo.
 *
 * `android/` e `ios/` no están en git: este plugin es la fuente, y se aplica
 * en cada `npx expo prebuild`.
 */
const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const { withLlamadaEntranteIos } = require("./ios");

const PAQUETE = "com.veciyo.app.llamadas";
const ARCHIVOS = [
  "LlamadaEntrante.kt",
  "LlamadaEntranteExtension.kt",
  "LlamadaActivity.kt",
  "RechazarLlamadaReceiver.kt",
];

function withArchivosKotlin(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const destino = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/java",
        ...PAQUETE.split("."),
      );
      fs.mkdirSync(destino, { recursive: true });
      for (const archivo of ARCHIVOS) {
        fs.copyFileSync(path.join(__dirname, "android", archivo), path.join(destino, archivo));
      }
      return cfg;
    },
  ]);
}

function conNombre(lista, nombre) {
  return (lista ?? []).filter((e) => e.$["android:name"] !== nombre);
}

function withManifiesto(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifiesto = cfg.modResults;
    AndroidConfig.Permissions.ensurePermissions(manifiesto, [
      "android.permission.USE_FULL_SCREEN_INTENT",
      "android.permission.VIBRATE",
    ]);

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifiesto);

    const pantalla = `${PAQUETE}.LlamadaActivity`;
    app.activity = conNombre(app.activity, pantalla);
    app.activity.push({
      $: {
        "android:name": pantalla,
        "android:exported": "false",
        "android:launchMode": "singleInstance",
        "android:excludeFromRecents": "true",
        "android:showWhenLocked": "true",
        "android:turnScreenOn": "true",
        "android:screenOrientation": "portrait",
        "android:theme": "@android:style/Theme.DeviceDefault.NoActionBar",
      },
    });

    const receptor = `${PAQUETE}.RechazarLlamadaReceiver`;
    app.receiver = conNombre(app.receiver, receptor);
    app.receiver.push({ $: { "android:name": receptor, "android:exported": "false" } });

    const extension = "com.onesignal.NotificationServiceExtension";
    app["meta-data"] = conNombre(app["meta-data"], extension);
    app["meta-data"].push({
      $: { "android:name": extension, "android:value": `${PAQUETE}.LlamadaEntranteExtension` },
    });
    return cfg;
  });
}

module.exports = function withLlamadaEntrante(config) {
  config = withArchivosKotlin(config);
  config = withManifiesto(config);
  config = withLlamadaEntranteIos(config);
  return config;
};
