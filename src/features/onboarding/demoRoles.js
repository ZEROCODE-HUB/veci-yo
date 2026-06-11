/**
 * Puntos de entrada "Demo <Rol>" desde la pantalla de inicio.
 * Agregar un nuevo rol es solo sumar una entrada aquí — la pantalla de
 * login y la ruta `/demo/:rol` los recogen automáticamente, sin tocar
 * más código. Próximos roles ya previstos: propietario, residente,
 * administración (agregarlos es sumar un objeto a este array).
 *
 * `available: true` significa que el flujo del rol ya está implementado
 * y la ruta debe apuntar a su pantalla de entrada real; mientras no lo esté,
 * `/demo/:rol` muestra una vista de "próximamente" con la identidad del rol.
 */
export const DEMO_ROLES = [
  { key: 'propietario', label: 'Demo Propietario', emoji: '🏠', available: true },
  { key: 'guardia', label: 'Demo Seguridad', emoji: '🛡️', available: true },
  { key: 'administrador', label: 'Demo Administrador', emoji: '🗂️', available: true },
  { key: 'inquilino-lider', label: 'Demo Inquilino Líder', emoji: '🔑', available: true },
];

export function getDemoRole(key) {
  return DEMO_ROLES.find(r => r.key === key);
}
