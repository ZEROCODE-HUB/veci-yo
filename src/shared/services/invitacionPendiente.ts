import { BASE_ENLACE } from "./invitaciones";

/**
 * La invitación que alguien estaba mirando cuando fue a crearse la cuenta.
 *
 * Quien abre un enlace de invitación sin tener cuenta pulsa «Crear cuenta»,
 * se registra, y Supabase le manda un correo para confirmar. El enlace de ese
 * correo tiene que **traerlo de vuelta a la invitación**. Volvía a
 * `location.href`, que a esas alturas es la pantalla de registro: la persona
 * confirmaba su correo y aterrizaba en una aplicación sin edificio, con la
 * invitación perdida en otro correo (13/10/2026).
 *
 * Vive en memoria: el registro ocurre en la misma visita en la que se abrió
 * la invitación. No es un dato, es un «por dónde iba».
 */
let token: string | null = null;

export function recordarInvitacion(nuevo: string) {
  token = nuevo.trim() || null;
}

/** La dirección a la que hay que volver tras confirmar el correo, si la hay. */
export function enlaceDeLaInvitacionPendiente(): string | undefined {
  return token ? `${BASE_ENLACE}/invitacion?token=${token}` : undefined;
}
