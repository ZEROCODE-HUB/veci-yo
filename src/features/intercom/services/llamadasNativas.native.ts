import { requireOptionalNativeModule } from "expo";
import type { EventoNativo, PermisosDeLlamada } from "./llamadasNativas";

/**
 * llamadasNativas · la llamada del sistema (CallKit en iPhone), 28/10/2026
 *
 * El módulo `VeciyoLlamadas` (`modules/veciyo-llamadas`): en iPhone es
 * CallKit y PushKit. En Android la llamada la hace el código del APK
 * (`plugins/llamada-entrante`) y llega como enlace `veciyo://llamada?…`; ahí
 * el módulo solo dice si faltan permisos (pantalla completa, batería) y abre
 * el ajuste. Sin el módulo --un APK o una versión anterior--, nada.
 */

interface ModuloLlamadas {
  listo(): Record<string, string>[];
  tokenVoip(): string | null;
  terminar(llamadaId: string): void;
  // Solo en Android (APK 6 en adelante).
  puedePantallaCompleta?: () => boolean;
  abrirAjustePantallaCompleta?: () => void;
  sinAhorroDeBateria?: () => boolean;
  pedirSinAhorroDeBateria?: () => void;
  addListener(evento: string, oyente: (datos: Record<string, string>) => void): { remove(): void };
}

const modulo = requireOptionalNativeModule<ModuloLlamadas>("VeciyoLlamadas");

function leer(evento: string, datos: Record<string, string>): EventoNativo | null {
  if ((evento === "contestar" || evento === "colgar") && datos.llamadaId) {
    return { evento, llamadaId: datos.llamadaId };
  }
  if (evento === "tokenVoip" && datos.token) return { evento, token: datos.token };
  return null;
}

export function escucharLlamadasNativas(
  alEvento: (evento: EventoNativo) => void,
): { pendientes: EventoNativo[]; dejar: () => void } {
  if (!modulo) return { pendientes: [], dejar: () => {} };
  const suscripciones = (["contestar", "colgar", "tokenVoip"] as const).map((nombre) =>
    modulo.addListener(nombre, (datos) => {
      const leido = leer(nombre, datos);
      if (leido) alEvento(leido);
    }),
  );
  const pendientes = modulo
    .listo()
    .map((p) => leer(p.evento ?? "", p))
    .filter((p): p is EventoNativo => p !== null);
  return { pendientes, dejar: () => suscripciones.forEach((s) => s.remove()) };
}

export function tokenVoip(): string | null {
  return modulo?.tokenVoip() ?? null;
}

export function terminarLlamadaNativa(llamadaId: string): void {
  modulo?.terminar(llamadaId);
}

export function permisosDeLlamada(): PermisosDeLlamada | null {
  if (!modulo?.puedePantallaCompleta || !modulo.sinAhorroDeBateria) return null;
  return {
    pantallaCompleta: modulo.puedePantallaCompleta(),
    sinAhorroDeBateria: modulo.sinAhorroDeBateria(),
  };
}

export function abrirAjustePantallaCompleta(): void {
  modulo?.abrirAjustePantallaCompleta?.();
}

export function pedirSinAhorroDeBateria(): void {
  modulo?.pedirSinAhorroDeBateria?.();
}
