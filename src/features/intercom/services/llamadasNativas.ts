/**
 * llamadasNativas · la llamada del sistema (CallKit en iPhone), versión web
 *
 * En la web y en las pruebas no hay llamada del sistema: todo es no hacer
 * nada. La del celular está en `llamadasNativas.native.ts`.
 */

export type EventoNativo =
  | { evento: "contestar"; llamadaId: string }
  | { evento: "colgar"; llamadaId: string }
  | { evento: "tokenVoip"; token: string };

/** Empieza a escuchar. Devuelve lo que pasó antes y cómo dejar de escuchar. */
export function escucharLlamadasNativas(
  _alEvento: (evento: EventoNativo) => void,
): { pendientes: EventoNativo[]; dejar: () => void } {
  return { pendientes: [], dejar: () => {} };
}

/** El token de PushKit del iPhone, o null. */
export function tokenVoip(): string | null {
  return null;
}

/** Quita la llamada de la pantalla del sistema: terminó en otro sitio. */
export function terminarLlamadaNativa(_llamadaId: string): void {}

/**
 * Lo que este celular necesita para que la llamada llegue con la app
 * cerrada. `null` donde no aplica (web, iPhone, un APK sin el módulo).
 */
export interface PermisosDeLlamada {
  /** Puede enseñar la llamada a pantalla completa con el celular bloqueado. */
  pantallaCompleta: boolean;
  /** Android no la cierra para ahorrar batería. */
  sinAhorroDeBateria: boolean;
}

export function permisosDeLlamada(): PermisosDeLlamada | null {
  return null;
}

export function abrirAjustePantallaCompleta(): void {}

export function pedirSinAhorroDeBateria(): void {}
