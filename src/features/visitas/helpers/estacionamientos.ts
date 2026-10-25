/**
 * Los vehículos de una reserva de huésped y los estacionamientos del
 * alojamiento.
 *
 * Hueco 17, decidido con el cliente el 25/10/2026: el número lo pone el
 * anfitrión en «Huéspedes temporales».
 *   · vacío (`null`): no lo indicó, no limita;
 *   · 0: no se registra ningún vehículo;
 *   · un número: es el máximo de vehículos.
 * En el preregistro lo hace cumplir la base (`guardar_vehiculo_precheckin`).
 * Aquí la reserva del anfitrión aplica el mismo tope, para que no apunte
 * vehículos que su huésped después no podrá registrar.
 */

/** El máximo de vehículos: el de los estacionamientos, si los hay, y si no el general. */
export function topeDeVehiculos(estacionamientos: number | null | undefined, topeGeneral: number): number {
  if (estacionamientos === null || estacionamientos === undefined) return topeGeneral;
  return Math.min(estacionamientos, topeGeneral);
}

/** Si el alojamiento no admite vehículos de huéspedes (0 estacionamientos). */
export function sinEstacionamiento(estacionamientos: number | null | undefined): boolean {
  return estacionamientos === 0;
}

/** Lo que se le dice al anfitrión bajo el contador, o nulo si no hay límite. */
export function ayudaDeEstacionamientos(estacionamientos: number | null | undefined): string | null {
  if (estacionamientos === null || estacionamientos === undefined) return null;
  if (estacionamientos === 0) {
    return "Tu alojamiento no tiene estacionamiento para huéspedes: no se pueden registrar vehículos. Lo cambias en Configuración › Huéspedes temporales.";
  }
  const plazas =
    estacionamientos === 1 ? "1 estacionamiento" : `${estacionamientos} estacionamientos`;
  return `Máximo ${estacionamientos}: tu alojamiento ofrece ${plazas} para huéspedes.`;
}
