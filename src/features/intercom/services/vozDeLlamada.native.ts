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
 */
import { AppState, PermissionsAndroid, Platform } from "react-native";
import type { Room as RoomTipo } from "livekit-client";
import { Camera } from "expo-camera";
import { anotarEnLaBase, describirError } from "@/shared/services/erroresDeLaApp";

export interface Conexion {
  silenciar: (silencio: boolean) => Promise<void>;
  colgar: () => Promise<void>;
}

type Nativo = typeof import("@livekit/react-native");

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

/**
 * iPhone: pide el permiso del micrófono con la app abierta, para que al
 * contestar con el iPhone bloqueado ya esté dado (bloqueado, iOS no puede
 * preguntar). En Android se pide al llamar, como hasta ahora.
 */
export async function prepararMicrofono(): Promise<void> {
  if (Platform.OS !== "ios" || AppState.currentState !== "active") return;
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
  const permiso = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
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
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ).catch(() => undefined);
  }
}

export async function conectarVoz(
  servidor: string,
  token: string,
  alCortarse: () => void,
): Promise<Conexion> {
  const { AudioSession } = piezasNativas();
  await pedirMicrofono();
  // Después de `registerGlobals`: livekit-client busca el WebRTC al cargarse.
  const { Room, RoomEvent } = require("livekit-client") as typeof import("livekit-client");

  // En iPhone, en segundo plano, el audio puede no estar disponible hasta que
  // CallKit lo entrega: se reintenta y, si no, se sigue (no es para colgar).
  const enIphone = Platform.OS === "ios";
  const falloAudio = await conReintentos(
    () => AudioSession.startAudioSession(),
    enIphone ? 8 : 1,
    500,
  );
  if (falloAudio) {
    anotarFallo("abrir el audio", falloAudio);
    if (!enIphone) throw falloAudio;
  }

  const sala: RoomTipo = new Room({ adaptiveStream: true, dynacast: true });
  // En el teléfono la voz del otro suena sola: no hay que adjuntarla a nada.
  sala.on(RoomEvent.Disconnected, alCortarse);
  try {
    await sala.connect(servidor, token);
  } catch (e) {
    anotarFallo("conectar a la sala", e);
    sala.off(RoomEvent.Disconnected, alCortarse);
    await sala.disconnect().catch(() => {});
    await AudioSession.stopAudioSession().catch(() => {});
    throw e;
  }

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
    sala.off(RoomEvent.Disconnected, alCortarse);
    await sala.disconnect().catch(() => {});
    await AudioSession.stopAudioSession().catch(() => {});
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
    colgar: async () => {
      alVolver.remove();
      sala.off(RoomEvent.Disconnected, alCortarse);
      await sala.disconnect();
      await AudioSession.stopAudioSession().catch(() => {});
    },
  };
}
