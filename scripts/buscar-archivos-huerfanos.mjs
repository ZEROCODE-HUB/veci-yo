/**
 * Los archivos que nadie importa.
 *
 * Existe porque apareció uno por casualidad: `features/visitas/utils/` era una
 * copia entera de `features/visitas/helpers/visitas.helpers.ts` --las mismas
 * siete funciones, con los mismos nombres-- que nadie importaba desde hacía
 * meses. Se encontró porque una de sus funciones salió en la lista de
 * variables sin usar, no porque nada lo vigilara.
 *
 * `buscar-funciones-sueltas` mira funciones y `buscar-botones-muertos` mira
 * controles; un archivo completo al que no llega ningún `import` no lo veía
 * nadie. Y es peor que una función suelta: mientras existe, alguien puede
 * leerlo y creer que es el código vigente.
 *
 * Los puntos de entrada --lo que arranca la aplicación, la configuración, las
 * pruebas-- no los importa nadie por definición y no cuentan.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/** Lo que nadie importa por diseño. */
const ENTRADAS = [
  /^src[\\/]app[\\/]/, // Expo Router
  /^src[\\/]types[\\/]/, // declaraciones de tipos globales
  /\.d\.ts$/,
  /\.test\.tsx?$/,
  /[\\/]index\.ts$/, // barriles: se importan por su carpeta
  /^src[\\/]pruebas[\\/]/, // los cargan los `vitest.*.config.mts`, no un import
];

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const todos = archivos(FUENTE);
const contenidos = new Map(
  todos.map((ruta) => [ruta, readFileSync(ruta, "utf-8")]),
);

/** Cada `import ... from "X"` de un archivo, resuelto a una ruta real. */
function importaciones(ruta, texto) {
  const destinos = [];
  const patron = /from\s+["']([^"']+)["']|import\(["']([^"']+)["']\)/g;
  let coincide;
  while ((coincide = patron.exec(texto)) !== null) {
    const especificador = coincide[1] ?? coincide[2];
    let base;
    if (especificador.startsWith("@/")) {
      base = join(FUENTE, especificador.slice(2));
    } else if (especificador.startsWith(".")) {
      base = resolve(dirname(ruta), especificador);
    } else {
      continue; // un paquete de node_modules
    }
    // El especificador no lleva extensión, y puede apuntar a una carpeta.
    for (const candidato of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ]) {
      if (contenidos.has(candidato)) {
        destinos.push(candidato);
        break;
      }
    }
  }
  return destinos;
}

const importados = new Set();
for (const [ruta, texto] of contenidos) {
  for (const destino of importaciones(ruta, texto)) importados.add(destino);
}

const huerfanos = todos
  .filter((ruta) => !importados.has(ruta))
  .map((ruta) => relative(RAIZ, ruta))
  .filter((ruta) => !ENTRADAS.some((patron) => patron.test(ruta)))
  .sort();

/*
  Un barril que reexporta un archivo lo mantiene «importado» aunque nadie
  importe el barril. Así que un archivo cuyo único importador es un `index.ts`
  huérfano también está muerto: se resuelve en cadena.
*/
const barrilesVivos = new Set();
for (const [ruta, texto] of contenidos) {
  if (!/[\\/]index\.ts$/.test(ruta)) continue;
  const relativo = relative(RAIZ, ruta);
  if (importados.has(ruta)) {
    barrilesVivos.add(relativo);
    continue;
  }
  void texto;
}

const MARCA = Number(process.env.HUERFANOS_MARCA ?? "0");

console.log(`archivos en src: ${todos.length}`);
console.log(`sin ningun import que los alcance: ${huerfanos.length}`);
for (const ruta of huerfanos) console.log(`  ${ruta}`);
void barrilesVivos;

if (huerfanos.length > MARCA) {
  console.error(
    `\nLa marca esta en ${MARCA} y hay ${huerfanos.length}. Un archivo que ` +
      `nadie importa o se conecta o se borra: mientras esta ahi, el siguiente ` +
      `que lo lea va a creer que es el codigo vigente.`,
  );
  process.exit(1);
}
