/**
 * Lo que se le dice al anfitrión si su huésped trae más vehículos que
 * estacionamientos ofrece el alojamiento.
 *
 * Hueco 17 (decidido el 25/10/2026): el número lo pone el anfitrión en
 * «Huéspedes temporales» y no limitaba nada. Ahora avisa, **sin bloquear**:
 * es una regla del alojamiento, y esas son advertencia (KT, flujo 4.1 paso 5).
 * La web le dice lo mismo al huésped (`avisoDeEstacionamientos` en
 * `veciyo-web/src/lib/precheckin.ts`).
 *
 * Con cero no se afirma que «no hay»: puede que el anfitrión no lo indicara.
 */
export function avisoDeEstacionamientos(
  vehiculos: number,
  estacionamientos: number | null | undefined,
): string | null {
  if (estacionamientos === null || estacionamientos === undefined) return null;
  if (vehiculos <= estacionamientos) return null;
  if (estacionamientos === 0) {
    return "No has indicado estacionamientos para tus huéspedes (Configuración › Huéspedes temporales). Dile a tu huésped dónde dejar el vehículo.";
  }
  const plazas =
    estacionamientos === 1 ? "1 estacionamiento" : `${estacionamientos} estacionamientos`;
  return `Tu alojamiento ofrece ${plazas} y tu huésped trae ${vehiculos} vehículos: los demás tendrán que quedarse fuera del edificio.`;
}
