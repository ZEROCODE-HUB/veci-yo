/**
 * La voz del intercomunicador en el teléfono, por LiveKit (22/10/2026).
 *
 * Hasta hoy el teléfono decía «llega con la app compilada» y la llamada solo
 * funcionaba en el navegador; el cliente lo vio en el celular. Usa el mismo
 * `livekit-client` que la web, con el WebRTC nativo que pone
 * `@livekit/react-native` (`registerGlobals`).
 *
 * Las piezas nativas se cargan **al llamar** y no al abrir la app: el APK
 * instalado antes de este cambio no las trae, y la actualización por el aire le
 * llega igual. Ahí se dice que hay que instalar la versión nueva, en vez de
 * cerrarse la app al arrancar.
 *
 * 09/11/2026, iPhone: contestar desde la pantalla de llamada (CallKit) con el
 * iPhone bloqueado se cortaba a los 2 segundos. La app está en segundo plano,
 * y ahí iOS puede negar el audio hasta que CallKit lo entrega, y no deja
 * preguntar por el micrófono. Cualquiera de los dos fallos tiraba la
 * conexión entera y la app colgaba. Ahora:
 *   · el audio se reintenta unos segundos y, si no, se sigue igual (CallKit
 *     lo activa por su cuenta);
 *   · el micrófono se reintenta y se vuelve a intentar al abrir la app; sin
 *     él se oye al otro, pero la llamada no se cae;
 *   · el permiso del micrófono se pide antes, con la app abierta
 *     (`prepararMicrofono`);
 *   · cada fallo deja rastro en `error_de_la_app` («voz de la llamada»).
 *
 * 17/11/2026, tres pedidos del cliente:
 *   · **Altavoz**: la conexión trae `altavoz(si)`. En Android elige la salida
 *     («speaker» o «earpiece»); en iPhone fuerza el altavoz o vuelve al
 *     auricular (modo «voiceChat» sin «defaultToSpeaker»). Con qué empieza lo
 *     dice el parámetro `llamada_empieza_en_altavoz`.
 *   · **Tarda en agarrar el audio**: en los rastros del 17/11 la voz quedaba
 *     lista unos 7 s después de empezar a llamar, y hasta 10 s después de
 *     contestar en Android. Todo iba en fila: permiso del micrófono, audio (en
 *     iPhone hasta 8 intentos de medio segundo ANTES de conectar), sala,
 *     micrófono. Ahora el audio se abre a la vez que se conecta la sala, la
 *     conexión se calienta mientras suena (`precalentarVoz`) y en Android el
 *     permiso del micrófono se pide también al abrir la app.
 *   · **iPhone en segundo plano no se escuchaba**: contestando desde CallKit,
 *     iOS no deja a la app activar el audio («Session activation failed», en
 *     los rastros del 17/11 a las 17:03): lo activa CallKit, y WebRTC no se
 *     entera porque el código nativo no se lo dice. Cuando abrir el audio
 *     falla en iPhone, ahora se le avisa desde aquí
 *     (`RTCAudioSession.audioSessionDidActivate`). El arreglo completo es
 *     nativo (`CentralDeLlamadas.swift`, `didActivate`), para la próxima
 *     versión de la tienda.
 */
import { AppState, PermissionsAndroid, Platform } from "react-native";
import type { Room as RoomTipo } from "livekit-client";
import { Camera } from "expo-camera";
import { anotarEnLaBase, describirError } from "@/shared/services/erroresDeLaApp";

export interface Conexion {
  silenciar: (silencio: boolean) => Promise<void>;
  /** Altavoz (true) o auricular (false). */
  altavoz: (si: boolean) => Promise<void>;
  colgar: () => Promise<void>;
}

export interface OpcionesDeVoz {
  /** Con qué salida empieza: el altavoz o el auricular. */
  altavoz: boolean;
}

type Nativo = typeof import("@livekit/react-native");
type LiveKit = typeof import("livekit-client");

let nativo: Nativo | null = null;

const DONDE = "voz de la llamada";

function piezasNativas(): Nativo {
  if (nativo) return nativo;
  try {
    const lk = require("@livekit/react-native") as Nativo;
    lk.registerGlobals();
    nativo = lk;
    return lk;
  } catch {
    throw new Error(
      "Para llamar desde el celular hay que instalar la versión nueva de la app (el APK nuevo).",
    );
  }
}

function liveKit(): LiveKit {
  // Después de `registerGlobals`: livekit-client busca el WebRTC al cargarse.
  piezasNativas();
  return require("livekit-client") as LiveKit;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Intenta `paso` varias veces; devuelve el último error o null si salió. */
async function conReintentos(
  paso: () => Promise<unknown>,
  intentos: number,
  pausaMs: number,
): Promise<unknown> {
  let ultimo: unknown = null;
  for (let i = 0; i < intentos; i++) {
    try {
      await paso();
      return null;
    } catch (e) {
      ultimo = e;
      if (i < intentos - 1) await esperar(pausaMs);
    }
  }
  return ultimo;
}

function anotarFallo(paso: string, e: unknown) {
  const { mensaje, detalle } = describirError(e);
  void anotarEnLaBase("error", DONDE, `${paso}: ${mensaje}`, detalle);
}

/** Android: se pregunta una vez por cada apertura de la app. */
let yaSePreguntoEnAndroid = false;

/**
 * Pide el permiso del micrófono con la app abierta, para que al contestar ya
 * esté dado. iPhone: bloqueado, iOS no puede preguntar. Android (17/11/2026):
 * antes se preguntaba al contestar, y la ventana del permiso se comía los
 * primeros segundos de la llamada.
 */
export async function prepararMicrofono(): Promise<void> {
  if (AppState.currentState !== "active") return;
  if (Platform.OS === "android") {
    if (yaSePreguntoEnAndroid) return;
    yaSePreguntoEnAndroid = true;
    try {
      const permiso = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
      if (await PermissionsAndroid.check(permiso)) return;
      const respuesta = await PermissionsAndroid.request(permiso);
      void anotarEnLaBase("rastro", DONDE, `permiso del micrófono: ${respuesta}`);
    } catch (e) {
      anotarFallo("pedir el micrófono", e);
    }
    return;
  }
  if (Platform.OS !== "ios") return;
  try {
    const actual = await Camera.getMicrophonePermissionsAsync();
    if (actual.status === "undetermined") {
      const respuesta = await Camera.requestMicrophonePermissionsAsync();
      void anotarEnLaBase("rastro", DONDE, `permiso del micrófono: ${respuesta.status}`);
    }
  } catch (e) {
    anotarFallo("pedir el micrófono", e);
  }
}

async function pedirMicrofono() {
  if (Platform.OS === "ios") {
    const actual = await Camera.getMicrophonePermissionsAsync().catch(() => null);
    if (actual?.status === "denied") {
      throw new Error(
        "Sin permiso del micrófono no se puede hablar. Puedes darlo en Ajustes › Veciyo › Micrófono.",
      );
    }
    return;
  }
  if (Platform.OS !== "android") return;
  // Ya dado (lo normal desde `prepararMicrofono`): no se vuelve a preguntar.
  const microfono = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  const yaDado = await PermissionsAndroid.check(microfono).catch(() => false);
  const permiso = yaDado
    ? PermissionsAndroid.RESULTS.GRANTED
    : await PermissionsAndroid.request(microfono);
  if (permiso !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error(
      "Sin permiso del micrófono no se puede hablar. Puedes darlo en los ajustes del celular.",
    );
  }
  /*
    Desde Android 12 el audio de la llamada mira los auriculares bluetooth, y
    sin este permiso el sistema cierra la app al abrir el audio: la pantalla
    se quedaba negra al contestar (QA 23/10/2026). Si lo niega, la llamada
    sigue por el altavoz del teléfono.
  */
  if (Number(Platform.Version) >= 31) {
    const bluetooth = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
    const dado = await PermissionsAndroid.check(bluetooth).catch(() => false);
    if (!dado) await PermissionsAndroid.request(bluetooth).catch(() => undefined);
  }
}

/** La sala ya calentada mientras suena, para no empezar de cero al contestar. */
let preparada: { servidor: string; token: string; sala: RoomTipo } | null = null;

/**
 * Mientras suena (17/11/2026): carga las piezas nativas y calienta la conexión
 * con el servidor de voz (`prepareConnection`: DNS, TLS y región) sin entrar
 * a la sala --entrar haría oír al otro antes de contestar--. Si falla no pasa
 * nada: al contestar se conecta como siempre.
 */
export async function precalentarVoz(servidor: string, token: string): Promise<void> {
  if (preparada?.token === token) return;
  try {
    const { Room } = liveKit();
    const sala: RoomTipo = new Room({ adaptiveStream: true, dynacast: true });
    preparada = { servidor, token, sala };
    await sala.prepareConnection(servidor, token);
  } catch {
    // Solo era para ganar tiempo.
  }
}

/**
 * Altavoz o auricular. Android elige la salida; iPhone fuerza el altavoz o
 * vuelve al auricular, y lo deja dicho para cuando el audio se reconfigure
 * solo (`setupIOSAudioManagement`).
 */
async function elegirSalida(si: boolean): Promise<void> {
  const { AudioSession, setupIOSAudioManagement } = piezasNativas();
  if (Platform.OS === "android") {
    await AudioSession.selectAudioOutput(si ? "speaker" : "earpiece");
    return;
  }
  if (Platform.OS !== "ios") return;
  setupIOSAudioManagement(si);
  if (si) {
    await AudioSession.selectAudioOutput("force_speaker");
    return;
  }
  await AudioSession.setAppleAudioConfiguration({
    audioCategory: "playAndRecord",
    audioCategoryOptions: ["allowBluetooth", "allowBluetoothA2DP", "allowAirPlay"],
    audioMode: "voiceChat",
  });
  await AudioSession.selectAudioOutput("default");
}

/**
 * iPhone contestando desde CallKit en segundo plano: la app no puede activar
 * el audio (lo activa CallKit) y WebRTC no lo sabe. Se le dice aquí que ya
 * está activo, para que encienda el micrófono y la salida.
 */
function avisarQueCallKitActivoElAudio(): void {
  try {
    const webrtc = require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc");
    webrtc.RTCAudioSession.audioSessionDidActivate();
    void anotarEnLaBase("rastro", DONDE, "audio de CallKit avisado a WebRTC");
  } catch (e) {
    anotarFallo("avisar el audio de CallKit", e);
  }
}

export async function conectarVoz(
  servidor: string,
  token: string,
  alCortarse: () => void,
  opciones: OpcionesDeVoz = { altavoz: true },
): Promise<Conexion> {
  const { AudioSession, setupIOSAudioManagement } = piezasNativas();
  const { Room, RoomEvent } = liveKit();
  const enIphone = Platform.OS === "ios";
  if (enIphone) setupIOSAudioManagement(opciones.altavoz);

  /*
    El audio y la sala, a la vez (17/11/2026): antes la sala esperaba a que el
    audio se abriera, y en iPhone eso eran hasta 4 s de reintentos. En iPhone,
    en segundo plano, el audio puede no estar disponible porque lo entrega
    CallKit: se reintenta poco y, si no, se le avisa a WebRTC de que CallKit
    ya lo activó (no es para colgar).
  */
  const abrirAudio = (async () => {
    await pedirMicrofono();
    const falloAudio = await conReintentos(
      () => AudioSession.startAudioSession(),
      enIphone ? 4 : 1,
      400,
    );
    if (falloAudio) {
      anotarFallo("abrir el audio", falloAudio);
      if (!enIphone) throw falloAudio;
      avisarQueCallKitActivoElAudio();
    }
  })();

  // La sala calentada mientras sonaba, si es esta; si no, una nueva.
  const sala: RoomTipo =
    preparada?.token === token && preparada.servidor === servidor
      ? preparada.sala
      : new Room({ adaptiveStream: true, dynacast: true });
  preparada = null;
  // En el teléfono la voz del otro suena sola: no hay que adjuntarla a nada.
  sala.on(RoomEvent.Disconnected, alCortarse);
  const deshacer = async () => {
    sala.off(RoomEvent.Disconnected, alCortarse);
    await sala.disconnect().catch(() => {});
    await AudioSession.stopAudioSession().catch(() => {});
  };
  const conectar = sala.connect(servidor, token).catch((e: unknown) => {
    anotarFallo("conectar a la sala", e);
    throw e;
  });
  const [audio, conexion] = await Promise.allSettled([abrirAudio, conectar]);
  if (audio.status === "rejected" || conexion.status === "rejected") {
    await deshacer();
    throw audio.status === "rejected"
      ? audio.reason
      : (conexion as PromiseRejectedResult).reason;
  }

  // La salida elegida. Si falla, se oye por la de siempre.
  await elegirSalida(opciones.altavoz).catch((e) => anotarFallo("elegir la salida", e));

  // El micrófono: si falla, la llamada sigue (se oye al otro) y se vuelve a
  // intentar al abrir la app.
  let microfonoListo = false;
  let silenciado = false;
  const encenderMicrofono = async (intentos: number) => {
    const fallo = await conReintentos(
      () => sala.localParticipant.setMicrophoneEnabled(true),
      intentos,
      700,
    );
    microfonoListo = !fallo;
    if (fallo) anotarFallo("encender el micrófono", fallo);
    else void anotarEnLaBase("rastro", DONDE, "conectada con micrófono");
  };
  await encenderMicrofono(enIphone ? 4 : 1);
  if (!microfonoListo && !enIphone) {
    await deshacer();
    throw new Error("No se pudo encender el micrófono");
  }
  const alVolver = AppState.addEventListener("change", (estado) => {
    if (estado === "active" && !microfonoListo && !silenciado) void encenderMicrofono(2);
  });

  return {
    silenciar: async (silencio) => {
      silenciado = silencio;
      await sala.localParticipant.setMicrophoneEnabled(!silencio);
      if (!silencio) microfonoListo = true;
    },
    altavoz: (si) => elegirSalida(si),
    colgar: async () => {
      alVolver.remove();
      sala.off(RoomEvent.Disconnected, alCortarse);
      await sala.disconnect();
      await AudioSession.stopAudioSession().catch(() => {});
    },
  };
}
