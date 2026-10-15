/**
 * La voz del intercomunicador, por LiveKit (14/10/2026).
 *
 * Depende de la plataforma y vive aparte del repositorio. En el navegador usa
 * `livekit-client`, que habla WebRTC directamente. En el teléfono hace falta
 * la versión compilada de la app con `@livekit/react-native` (no corre en
 * Expo Go); hasta entonces se dice en vez de fallar en silencio.
 */
import { Platform } from "react-native";
import { Room, RoomEvent } from "livekit-client";

export interface Conexion {
  silenciar: (silencio: boolean) => Promise<void>;
  colgar: () => Promise<void>;
}

export async function conectarVoz(
  servidor: string,
  token: string,
  alCortarse: () => void,
): Promise<Conexion> {
  if (Platform.OS !== "web") {
    throw new Error(
      "En el teléfono el intercomunicador llega con la app compilada. Por ahora, úsalo desde el navegador.",
    );
  }
  const sala = new Room({ adaptiveStream: true, dynacast: true });
  // Que se oiga al otro: cada pista de audio que llega se adjunta a la página.
  sala.on(RoomEvent.TrackSubscribed, (pista) => {
    if (pista.kind === "audio") {
      const elemento = pista.attach();
      elemento.setAttribute("data-veciyo-voz", "");
      document.body.appendChild(elemento);
    }
  });
  sala.on(RoomEvent.Disconnected, alCortarse);
  await sala.connect(servidor, token);
  await sala.localParticipant.setMicrophoneEnabled(true);

  return {
    silenciar: async (silencio) => {
      await sala.localParticipant.setMicrophoneEnabled(!silencio);
    },
    colgar: async () => {
      sala.off(RoomEvent.Disconnected, alCortarse);
      await sala.disconnect();
      document.querySelectorAll("[data-veciyo-voz]").forEach((e) => e.remove());
    },
  };
}
