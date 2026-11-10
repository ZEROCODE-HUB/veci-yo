/**
 * Espera a `promesa`, pero no más de `ms`: pasado ese tiempo sigue sin ella
 * (26/10/2026). No cancela nada ni cambia lo que la promesa hace; solo pone un
 * tope a cuánto se la espera.
 */
export function esperarComoMucho(promesa: Promise<unknown>, ms: number): Promise<void> {
  return Promise.race([
    promesa.then(() => undefined),
    new Promise<void>((listo) => setTimeout(listo, ms)),
  ]);
}

/**
 * Lo que devuelve `promesa`, o un error con `motivo` si pasan `ms` sin
 * respuesta (10/11/2026). Para que un botón no se quede cargando para
 * siempre cuando la red o el servidor no contestan: la promesa sigue su curso,
 * pero la pantalla deja de esperarla.
 */
export function comoMuchoOFalla<T>(promesa: Promise<T>, ms: number, motivo: string): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promesa,
    new Promise<T>((_, fallar) => {
      reloj = setTimeout(() => fallar(new Error(motivo)), ms);
    }),
  ]).finally(() => clearTimeout(reloj));
}
