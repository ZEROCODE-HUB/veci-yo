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
 */
import { PermissionsAndroid, Platform } from "react-native";
import type { Room as RoomTipo } from "livekit-client";

export interface Conexion {
  silenciar: (silencio: boolean) => Promise<void>;
  colgar: () => Promise<void>;
}

type Nativo = typeof import("@livekit/react-native");

let nativo: Nativo | null = null;

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

async function pedirMicrofono() {
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

  await AudioSession.startAudioSession();
  const sala: RoomTipo = new Room({ adaptiveStream: true, dynacast: true });
  // En el teléfono la voz del otro suena sola: no hay que adjuntarla a nada.
  sala.on(RoomEvent.Disconnected, alCortarse);
  try {
    await sala.connect(servidor, token);
    await sala.localParticipant.setMicrophoneEnabled(true);
  } catch (e) {
    sala.off(RoomEvent.Disconnected, alCortarse);
    await sala.disconnect().catch(() => {});
    await AudioSession.stopAudioSession().catch(() => {});
    throw e;
  }

  return {
    silenciar: async (silencio) => {
      await sala.localParticipant.setMicrophoneEnabled(!silencio);
    },
    colgar: async () => {
      sala.off(RoomEvent.Disconnected, alCortarse);
      await sala.disconnect();
      await AudioSession.stopAudioSession().catch(() => {});
    },
  };
}
