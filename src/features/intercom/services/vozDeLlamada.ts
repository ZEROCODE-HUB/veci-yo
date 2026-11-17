/**
 * La voz del intercomunicador en el navegador, por LiveKit (14/10/2026).
 *
 * Depende de la plataforma y vive aparte del repositorio. Aquí `livekit-client`
 * habla WebRTC directamente; el teléfono usa `vozDeLlamada.native.ts`.
 *
 * La web es solo demostración (16/11/2026): el altavoz y el calentar la
 * conexión mientras suena (17/11/2026) son del teléfono; aquí no hacen nada.
 */
import { Room, RoomEvent } from "livekit-client";

export interface Conexion {
  silenciar: (silencio: boolean) => Promise<void>;
  /** Altavoz (true) o auricular (false). En el navegador no hay a qué cambiar. */
  altavoz: (si: boolean) => Promise<void>;
  colgar: () => Promise<void>;
}

export interface OpcionesDeVoz {
  altavoz: boolean;
}

export async function conectarVoz(
  servidor: string,
  token: string,
  alCortarse: () => void,
  _opciones?: OpcionesDeVoz,
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
    altavoz: async () => {},
    colgar: async () => {
      sala.off(RoomEvent.Disconnected, alCortarse);
      await sala.disconnect();
      document.querySelectorAll("[data-veciyo-voz]").forEach((e) => e.remove());
    },
  };
}

/** En el navegador el permiso del micrófono se pide al llamar. */
export async function prepararMicrofono(): Promise<void> {}

/** En el navegador no se calienta nada mientras suena. */
export async function precalentarVoz(_servidor: string, _token: string): Promise<void> {}
