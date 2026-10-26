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
