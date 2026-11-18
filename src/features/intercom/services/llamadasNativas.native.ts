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
  // Solo en iPhone, desde la versión de TestFlight del 18/11/2026.
  audioDeCallKit?: () => "ninguna" | "esperando" | "activo";
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

/**
 * Contestando desde CallKit, el audio lo entrega el iPhone cuando quiere
 * (18/11/2026). Devuelve `null` si no hay llamada de CallKit esperando ni
 * activa --o el módulo es anterior y no lo sabe--; si no, una promesa que se
 * cumple cuando el audio ya está activo (o a los `ms`, por si no llega).
 */
export function esperarAudioDeCallKit(ms: number): Promise<boolean> | null {
  const estado = modulo?.audioDeCallKit?.();
  if (!modulo || !estado || estado === "ninguna") return null;
  if (estado === "activo") return Promise.resolve(true);
  return new Promise((resolver) => {
    const reloj = setTimeout(() => {
      suscripcion.remove();
      resolver(false);
    }, ms);
    const suscripcion = modulo.addListener("audioActivado", () => {
      clearTimeout(reloj);
      suscripcion.remove();
      resolver(true);
    });
  });
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
