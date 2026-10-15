/**
 * El aviso que suena cuando llega un S.O.S. a la portería (14/10/2026).
 *
 * Depende de la plataforma, así que vive aparte: en el navegador, un pitido
 * con el sintetizador del propio navegador (no hace falta ningún archivo de
 * sonido); en el teléfono, vibración. El navegador solo deja sonar después de
 * que la persona haya tocado la página alguna vez: si no, suena la siguiente.
 */
import { Platform, Vibration } from "react-native";

export function sonarAlarma(): void {
  if (Platform.OS !== "web") {
    Vibration.vibrate([0, 600, 300, 600, 300, 600]);
    return;
  }
  try {
    const Contexto =
      (globalThis as { AudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    const ctx = new Contexto();
    for (let i = 0; i < 3; i += 1) {
      const oscilador = ctx.createOscillator();
      const volumen = ctx.createGain();
      oscilador.type = "square";
      oscilador.frequency.value = 880;
      volumen.gain.value = 0.15;
      oscilador.connect(volumen);
      volumen.connect(ctx.destination);
      const inicio = ctx.currentTime + i * 0.5;
      oscilador.start(inicio);
      oscilador.stop(inicio + 0.3);
    }
  } catch {
    // Sin permiso para sonar todavía: la pantalla roja ya avisa.
  }
}
