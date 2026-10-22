/**
 * La voz del intercomunicador en el navegador, por LiveKit (14/10/2026).
 *
 * Depende de la plataforma y vive aparte del repositorio. Aquí `livekit-client`
 * habla WebRTC directamente; el teléfono usa `vozDeLlamada.native.ts`.
 */
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
