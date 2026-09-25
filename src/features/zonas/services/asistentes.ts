/**
 * Cuánta gente va a la reserva, además de quien la pide.
 *
 * El desplegable iba de «1 persona» en adelante y **no tenía forma de decir
 * «ninguna»**: ir solo era dejarlo en blanco, que es una respuesta que nadie
 * adivina. La etiqueta llegó a explicarlo entre paréntesis, que es la señal
 * de que el control estaba mal: si hay que explicar cómo no contestar, falta
 * una opción.
 *
 * Y había un fuera de rango: la lista llegaba hasta la capacidad de la zona
 * --veinte en la piscina-- contando **acompañantes**, así que veinte
 * acompañantes más el titular son veintiuno en una zona de veinte.
 */
export const SOLO_YO = "Solo yo";

/** Las opciones del desplegable, para una zona de `capacidad` personas. */
export function opcionesDeAsistentes(capacidad: number): string[] {
  // El titular ocupa un sitio: los acompañantes caben en lo que queda.
  const acompanantes = Math.max(0, Math.floor(capacidad) - 1);
  return [
    SOLO_YO,
    ...Array.from(
      { length: acompanantes },
      (_, i) => `${i + 1} ${i === 0 ? "persona" : "personas"}`,
    ),
  ];
}

/**
 * Cuántos acompañantes significa la opción elegida.
 *
 * Vacío es cero, igual que «Solo yo»: se conserva porque una reserva vieja o
 * un formulario a medio rellenar llegan así, y contar mal seria peor que
 * contar cero.
 */
export function cuantosAsistentes(opcion: string | null | undefined): number {
  if (!opcion || opcion === SOLO_YO) return 0;
  const numero = Number.parseInt(opcion, 10);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}
