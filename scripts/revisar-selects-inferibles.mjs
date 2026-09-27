/**
 * `select` que Supabase no puede tipar.
 *
 * El tipo de lo que devuelve una consulta lo deduce Supabase **del literal** del
 * `select`. Si se construye concatenando cadenas, el tipo de la respuesta pasa a
 * ser `GenericStringError` y todo lo que lo lee acaba con `any` para compilar.
 *
 * Así nacieron una docena de los `any` de este proyecto: cuatro `select`
 * partidos en dos trozos --por caber en la línea-- y todos sus mapeadores sin
 * tipo. Al unirlos, el tipo salió del esquema generado sin escribir nada.
 *
 * Una constante también hay que declararla `as const`: sin eso es un `string`
 * cualquiera y pasa lo mismo.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.ts$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const culpables = [];

for (const ruta of archivos(join(RAIZ, "src"))) {
  const texto = readFileSync(ruta, "utf-8");
  const lineas = texto.split(/\r?\n/);

  lineas.forEach((linea, indice) => {
    // Un `select(` cuyo argumento se concatena: `"..." +` en la misma linea o
    // en la siguiente.
    if (!/\.select\(/.test(linea)) return;
    const bloque = lineas.slice(indice, indice + 6).join("\n");
    const hastaElCierre = bloque.slice(0, bloque.indexOf(")") + 1);
    if (/["'`]\s*\+/.test(hastaElCierre)) {
      culpables.push({
        ruta: relative(RAIZ, ruta),
        linea: indice + 1,
        motivo: "el argumento se concatena",
      });
    }
  });

  // Una constante de `select` sin `as const`.
  const patron = /const\s+(SELECT\w*)\s*=\s*`[^`]*`(\s*as const)?/g;
  let coincide;
  while ((coincide = patron.exec(texto)) !== null) {
    if (!coincide[2]) {
      culpables.push({
        ruta: relative(RAIZ, ruta),
        linea: texto.slice(0, coincide.index).split("\n").length,
        motivo: `\`${coincide[1]}\` sin \`as const\``,
      });
    }
  }
}

console.log(`selects que Supabase no puede tipar: ${culpables.length}`);
for (const c of culpables) {
  console.log(`  ${c.ruta}:${c.linea} — ${c.motivo}`);
}

if (culpables.length > 0) {
  console.error(
    `\nUn \`select\` que no es un literal deja la respuesta sin forma, y todo lo ` +
      `que la lee necesita \`any\`. Se escribe en una sola pieza, y una constante ` +
      `con \`as const\`.`,
  );
  process.exit(1);
}
