/**
 * Lo que se decide sobre un push sin tocar OneSignal, para poder probarlo.
 */

/**
 * Si el celular ya quedó registrado en OneSignal.
 *
 * OneSignal pone primero un id provisional que empieza por `local-` mientras
 * el celular todavía no habló con sus servidores: con ese id no llega nada, así
 * que no cuenta como registrado.
 */
export function estaRegistrado(suscripcionId: string | null | undefined): boolean {
  return Boolean(suscripcionId) && !suscripcionId!.startsWith("local-");
}

/**
 * El id del aviso de la campana que viaja dentro del push (`data` que arma la
 * función `enviar-push`). Lo que venga de fuera puede no traerlo: un push
 * mandado a mano desde el panel de OneSignal, por ejemplo.
 */
export function notificacionIdDe(datos: unknown): string | null {
  if (typeof datos !== "object" || datos === null) return null;
  const id = (datos as { notificacionId?: unknown }).notificacionId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/** El motivo del aviso que viaja dentro del push (`tipo`), si viene. */
export function tipoDe(datos: unknown): string | null {
  if (typeof datos !== "object" || datos === null) return null;
  const tipo = (datos as { tipo?: unknown }).tipo;
  return typeof tipo === "string" && tipo.length > 0 ? tipo : null;
}

/** Cómo está este celular para recibir avisos. */
export interface EstadoDelCelular {
  /** Si la app corre en un celular (en la web no hay push). */
  disponible: boolean;
  /** Si la persona dio permiso de notificaciones. */
  permiso: boolean;
  /** Si OneSignal ya registró el celular (id definitivo, no `local-`). */
  registrado: boolean;
}

export const SIN_PUSH: EstadoDelCelular = { disponible: false, permiso: false, registrado: false };
