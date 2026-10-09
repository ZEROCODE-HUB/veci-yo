/**
 * Que numero le toca a una ficha **entre las de su clase**.
 *
 * Las fichas de acompañante se titulan «Adulto 2» o «Menor 1», y hasta el
 * 09/10/2026 se titulaban todas «Acompañante N» con N siendo la posicion en la
 * lista. Con dos adultos y un menor eso daba «Acompañante 1, 2 y 3» y despues
 * un interruptor en cada una diciendo cual era cual.
 *
 * Numerar por la posicion global no sirve: con un adulto y dos menores saldria
 * «Adulto 1, Menor 2, Menor 3», y el 2 no significa nada. Cada clase se cuenta
 * por su cuenta.
 *
 * Es pura y vive aparte para poder comprobarla sin montar la pantalla: dentro
 * del `map` del JSX seria una regla que nadie prueba, que es como acaban
 * siendo decorativas.
 *
 * @returns el numero **dentro de su clase**, empezando en 1.
 */
export function numeroEntreIguales(
  acompanantes: { esMenor: boolean }[],
  indice: number,
): number {
  const mio = acompanantes[indice];
  if (!mio) return 1;
  return (
    acompanantes
      .slice(0, indice)
      .filter((otro) => otro.esMenor === mio.esMenor).length + 1
  );
}
