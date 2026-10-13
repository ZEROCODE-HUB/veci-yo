/**
 * Los códigos de vivienda que trae una hoja de pagos.
 *
 * La carga masiva prometía «Sube un Excel o CSV» y leía el archivo **como
 * texto**: un `.xlsx` es un zip, así que no detectaba nada, y un CSV con más
 * de una columna --«101;Ana Gómez;350000», que es como lo exporta cualquier
 * banco-- daba por código cada celda, nombres e importes incluidos
 * (13/10/2026).
 *
 * Aquí llega la hoja ya leída, fila a fila, y se decide **qué columna** lleva
 * los códigos:
 *
 *   1. la que tenga un encabezado que lo diga («Depto», «Unidad», «Código»…);
 *   2. si no, la que más coincida con las viviendas que existen;
 *   3. si no, la primera.
 *
 * Es pura para poder probarla: leer el archivo depende del dispositivo y va
 * aparte, en `pagosArchivo.ts`.
 */

const ENCABEZADO_DE_CODIGO =
  /^(c[oó]d(igo)?|depto\.?|departamento|dpto\.?|apto\.?|apartamento|unidad|vivienda|inmueble)(?![a-záéíóúñ0-9])/i;

const limpio = (celda: unknown) =>
  celda === null || celda === undefined ? "" : String(celda).trim();

const clave = (codigo: string) => codigo.toUpperCase().replace(/\s+/g, " ");

export function codigosDeHoja(
  filas: unknown[][],
  codigosConocidos: string[] = [],
): string[] {
  const hoja = filas
    .map((fila) => fila.map(limpio))
    .filter((fila) => fila.some(Boolean));
  if (!hoja.length) return [];

  const conocidos = new Set(codigosConocidos.map(clave));
  const columnas = Math.max(...hoja.map((fila) => fila.length));

  let columna = hoja[0].findIndex((celda) => ENCABEZADO_DE_CODIGO.test(celda));
  const tieneEncabezado = columna >= 0;

  if (!tieneEncabezado) {
    columna = 0;
    let mejor = 0;
    for (let i = 0; i < columnas; i += 1) {
      const aciertos = hoja.filter((fila) =>
        conocidos.has(clave(fila[i] ?? "")),
      ).length;
      if (aciertos > mejor) {
        mejor = aciertos;
        columna = i;
      }
    }
  }

  const vistos = new Set<string>();
  const codigos: string[] = [];
  for (const fila of tieneEncabezado ? hoja.slice(1) : hoja) {
    const codigo = fila[columna] ?? "";
    if (!codigo || vistos.has(clave(codigo))) continue;
    vistos.add(clave(codigo));
    codigos.push(codigo);
  }
  return codigos;
}

/** Lo que se pega a mano: uno por línea, o separados por coma o punto y coma. */
export function codigosDeTexto(texto: string): string[] {
  return codigosDeHoja(
    texto
      .split(/[\n,;]+/)
      .map((codigo) => [codigo]),
  );
}
