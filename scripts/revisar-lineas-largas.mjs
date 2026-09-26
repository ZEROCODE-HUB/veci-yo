/**
 * Componentes escritos en una sola línea.
 *
 * `AGENTS.md` lo prohíbe desde el principio --«Nada de componentes escritos en
 * una sola línea»-- y, como la regla de los tokens, **nadie la comprobaba**:
 * quedaban tres archivos con un componente entero en una línea, el mayor de
 * 3.017 caracteres.
 *
 * No es cosmética. Una línea así no se puede leer en una revisión, no se puede
 * comentar por línea, y el `git diff` de cualquier cambio dentro de ella es el
 * archivo completo: no se ve qué cambió.
 *
 * El tope son 400 caracteres, que deja pasar cualquier línea razonable --la más
 * larga legítima del proyecto anda por 150-- y coge las que son un archivo
 * entero.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const TOPE = 400;

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const culpables = [];
for (const ruta of archivos(join(RAIZ, "src"))) {
  const lineas = readFileSync(ruta, "utf-8").split(/\r?\n/);
  lineas.forEach((linea, indice) => {
    if (linea.length > TOPE) {
      culpables.push({
        ruta: relative(RAIZ, ruta),
        linea: indice + 1,
        largo: linea.length,
      });
    }
  });
}

console.log(`lineas de mas de ${TOPE} caracteres: ${culpables.length}`);
for (const c of culpables) {
  console.log(`  ${c.ruta}:${c.linea} (${c.largo} caracteres)`);
}

if (culpables.length > 0) {
  console.error(
    `\nUn componente en una linea no se puede revisar ni comentar, y su diff ` +
      `es el archivo entero. Se formatea: \`npx prettier --write <archivo>\`.`,
  );
  process.exit(1);
}
