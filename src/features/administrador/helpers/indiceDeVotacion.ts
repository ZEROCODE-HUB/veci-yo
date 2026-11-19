/**
 * El índice de votación de un departamento, en % del edificio (18/11/2026,
 * pedido del cliente): «el 100 % se divide entre las propiedades».
 *
 * Cada uno va de más de 0 a 100, entre todos no pasan de 100, y empieza vacío.
 * La base lo sujeta (`cuidar_indice_de_votacion`); esto es para que la
 * pantalla lo diga antes de guardar.
 */

/** «12,5» → 12.5; vacío → null (sin índice). */
export function leerIndiceDeVotacion(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** El motivo por el que no vale, o null si vale (vacío vale). */
export function problemaDelIndice(texto: string): string | null {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  if (!/^\d+(\.\d{1,4})?$/.test(limpio)) return "Escribe un porcentaje, por ejemplo 2,5";
  const n = Number(limpio);
  if (n <= 0) return "El índice tiene que ser mayor que 0 %";
  if (n > 100) return "El índice no puede pasar de 100 %";
  return null;
}

/** 12.5 → «12,5»; 100 → «100». Hasta cuatro decimales, sin ceros de sobra. */
export function porcentajeParaLeer(n: number): string {
  return String(Math.round(n * 10000) / 10000).replace(".", ",");
}

/**
 * Lo que se le dice a quien edita un departamento: cuánto suman los demás y
 * cuánto quedaría con lo que escribió.
 */
export function cuentaDelEdificio(sumaDeLosDemas: number, texto: string): { texto: string; pasa: boolean } {
  const propio = problemaDelIndice(texto) ? 0 : (leerIndiceDeVotacion(texto) ?? 0);
  const total = sumaDeLosDemas + propio;
  const queda = Math.max(100 - sumaDeLosDemas, 0);
  if (total > 100) {
    return {
      pasa: true,
      texto: `Con este, el edificio sumaría ${porcentajeParaLeer(total)} % y no puede pasar de 100 %. A este departamento le queda como máximo ${porcentajeParaLeer(queda)} %.`,
    };
  }
  return {
    pasa: false,
    texto: `Los demás departamentos suman ${porcentajeParaLeer(sumaDeLosDemas)} %. Con este, el edificio quedaría en ${porcentajeParaLeer(total)} % de 100 %.`,
  };
}
