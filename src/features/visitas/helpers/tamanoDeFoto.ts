/**
 * El tamaño de foto con el que se escanea el documento (26/10/2026).
 *
 * Para leer un número basta con unos 1280 px por el lado largo. La cámara del
 * sistema daba la foto entera --12 MP en un Android corriente, casi 50 MB al
 * abrirla para leerla-- y en el celular del tester la app se quedaba gris y se
 * cerraba. Se elige el tamaño más pequeño que llegue a ese mínimo; si ninguno
 * llega, el más grande que haya. Los nombres que no son «ancho x alto» (los
 * preajustes de iOS, como «Photo») se ignoran.
 */
export const LADO_LARGO_PARA_LEER = 1280;

export function tamanoParaLeer(tamanos: string[]): string | undefined {
  const medidos = tamanos
    .map((t) => {
      const m = /^(\d+)x(\d+)$/.exec(t.trim());
      return m ? { t, lado: Math.max(Number(m[1]), Number(m[2])) } : null;
    })
    .filter((x): x is { t: string; lado: number } => x !== null)
    .sort((a, b) => a.lado - b.lado);
  if (medidos.length === 0) return undefined;
  return (medidos.find((x) => x.lado >= LADO_LARGO_PARA_LEER) ?? medidos[medidos.length - 1]).t;
}
