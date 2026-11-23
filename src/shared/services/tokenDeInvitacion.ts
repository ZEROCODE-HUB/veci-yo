/**
 * El código de una invitación dentro de un enlace, venga como venga
 * (23/11/2026). La página web de la invitación abre la app con
 * `veciyo://invitacion?token=…`; el correo, con la web; y según el teléfono
 * el enlace llega con dos o tres barras. La navegación solo lo reconocía con
 * una forma exacta y, si no coincidía, la app abría en el login y el código se
 * perdía: el registro salía vacío (lo vio el cliente con el profesional
 * permanente).
 *
 * Aquí basta con que el enlace hable de una invitación y traiga `token`.
 */
export function tokenDeInvitacion(enlace: string | null | undefined): string | null {
  if (!enlace || !/invitacion/i.test(enlace)) return null;
  const encontrado = /[?&]token=([^&#]+)/.exec(enlace);
  if (!encontrado) return null;
  try {
    const token = decodeURIComponent(encontrado[1]).trim();
    return token || null;
  } catch {
    return null;
  }
}
