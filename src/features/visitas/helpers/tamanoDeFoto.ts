/**
 * El tamaño de foto con el que se escanea el documento.
 *
 * 26/10/2026: la cámara del sistema daba la foto entera --12 MP en un Android
 * corriente, casi 50 MB al abrirla para leerla-- y en el celular del tester la
 * app se quedaba gris y se cerraba. Se bajó a unos 1280 px por el lado largo.
 *
 * 05/11/2026: con 1280 el celular leía el apellido y no las cifras: ocho
 * escaneos seguidos de la misma cédula dieron «2 de 6 cifras» (Para Claude
 * 225). Ahora se busca entre 1920 y 2600 px, unos 3 a 5 MP: el número sale
 * nítido y la foto sigue siendo la cuarta parte de la entera.
 *
 * Se elige el más pequeño dentro de ese margen; si no hay ninguno, el más
 * grande por debajo; y si todos pasan del máximo, el más pequeño. Los nombres
 * que no son «ancho x alto» (los preajustes de iOS, como «Photo») se ignoran.
 */
export const LADO_LARGO_PARA_LEER = 1920;
export const LADO_LARGO_MAXIMO = 2600;

export function tamanoParaLeer(tamanos: string[]): string | undefined {
  const medidos = tamanos
    .map((t) => {
      const m = /^(\d+)x(\d+)$/.exec(t.trim());
      return m ? { t, lado: Math.max(Number(m[1]), Number(m[2])) } : null;
    })
    .filter((x): x is { t: string; lado: number } => x !== null)
    .sort((a, b) => a.lado - b.lado);
  if (medidos.length === 0) return undefined;
  const dentro = medidos.find((x) => x.lado >= LADO_LARGO_PARA_LEER && x.lado <= LADO_LARGO_MAXIMO);
  if (dentro) return dentro.t;
  const pequenos = medidos.filter((x) => x.lado < LADO_LARGO_PARA_LEER);
  return (pequenos.length > 0 ? pequenos[pequenos.length - 1] : medidos[0]).t;
}
