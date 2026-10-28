import { requireOptionalNativeModule } from "expo";
import type { EventoNativo } from "./llamadasNativas";

/**
 * llamadasNativas · la llamada del sistema (CallKit en iPhone), 28/10/2026
 *
 * El módulo `VeciyoLlamadas` (`modules/veciyo-llamadas`) solo existe en
 * iPhone. En Android la llamada del sistema la hace el código del APK
 * (`plugins/llamada-entrante`) y llega a la app como enlace
 * `veciyo://llamada?…`, así que aquí no hay nada: el módulo no está y todo
 * es no hacer nada. Igual en un iPhone con una versión sin el módulo.
 */

interface ModuloLlamadas {
  listo(): Record<string, string>[];
  tokenVoip(): string | null;
  terminar(llamadaId: string): void;
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
