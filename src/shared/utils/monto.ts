/**
 * Un importe tal como lo teclea una persona, a número.
 *
 * `Number("850.000".replace(/[^\d.]/g, ""))` da **850**: el punto de los miles
 * se leía como coma decimal, y un alquiler de ochocientos cincuenta mil se
 * guardaba como ochocientos cincuenta. Con «1.500.000» daba `NaN` y el botón
 * se apagaba sin decir por qué (13/10/2026).
 *
 * En los dos países del producto el punto separa miles y la coma decimales,
 * pero se teclea de las dos formas, así que se decide por la **forma**:
 *
 *   · grupos de tres cifras separados por punto o coma → son miles;
 *   · un único separador con una o dos cifras detrás → son decimales.
 *
 * Devuelve `null` si no hay nada escrito y `NaN` si no es un importe.
 */
export function montoDesdeTexto(texto: string): number | null {
  const limpio = texto.replace(/[\s$]/g, "");
  if (limpio === "") return null;
  if (!/^[0-9.,]+$/.test(limpio)) return Number.NaN;

  // Miles, con o sin decimales al final: 850.000 · 1.500.000 · 1.500.000,50
  const conMiles = limpio.match(/^(\d{1,3}(?:[.,]\d{3})+)(?:[.,](\d{1,2}))?$/);
  if (conMiles) {
    const entero = conMiles[1].replace(/[.,]/g, "");
    return Number(conMiles[2] ? `${entero}.${conMiles[2]}` : entero);
  }

  // Sin miles: 850000 · 850000,5 · 850000.50
  const simple = limpio.match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (simple) return Number(simple[2] ? `${simple[1]}.${simple[2]}` : simple[1]);

  return Number.NaN;
}
