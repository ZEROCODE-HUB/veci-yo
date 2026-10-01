#!/usr/bin/env node
/**
 * Comprueba la regla 11: ningún color literal dentro de un componente.
 *
 * La regla está escrita en `AGENTS.md` desde el principio y no la comprobaba
 * nadie, así que se fue deshaciendo sola. El caso que lo destapó: los cuatro
 * modales de la aplicación repetían a mano el mismo `rgba(0,0,0,0.5)` **que ya
 * existía en la paleta** como `bgOverlay`, sin usarlo. Una regla que solo vive
 * en un documento es una intención, no una garantía.
 *
 * No exige limpiar los 129 literales que hay hoy: exige que no crezcan. El
 * número vive en `tokens.baseline.json` y solo puede bajar. Si sube, esto
 * falla y dice dónde.
 *
 * Se salta los colores de marca de terceros --el icono de Google--, que la
 * propia regla exceptúa porque no son tokens del sistema.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BASE = join(RAIZ, "tokens.baseline.json");

/**
 * Un hexadecimal de 3 o 6 dígitos, o un `rgb()`/`rgba()`. Atrapa también las
 * clases de Tailwind con valor arbitrario --`bg-[#D4C5A9]`--, que son un
 * literal con otra ropa.
 */
const LITERAL = /#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?\b|rgba?\([^)]*\)/g;

/**
 * Borra los comentarios antes de mirar, conservando las posiciones.
 *
 * Un literal dentro de un comentario está explicando, no pintando. La primera
 * versión solo saltaba las líneas que *empiezan* por comentario, así que un
 * `{ /* ... rgba(0,0,0,0.5) ... *\/ }` de JSX contaba como infracción: explicar
 * el problema lo convertía en problema.
 */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/gm, (todo, antes) =>
      antes + " ".repeat(todo.length - antes.length),
    );
}

/** Ficheros exentos: colores de marca ajenos, que la regla 11 excluye. */
const EXENTOS = ["GoogleIcon.tsx"];

function* archivos(dir) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada.startsWith(".")) continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (ruta.endsWith(".tsx")) yield ruta;
  }
}

const hallazgos = [];
for (const ruta of archivos(join(RAIZ, "src"))) {
  if (EXENTOS.some((e) => ruta.endsWith(e))) continue;
  const texto = sinComentarios(readFileSync(ruta, "utf-8"));
  texto.split("\n").forEach((linea, i) => {
    for (const encontrado of linea.match(LITERAL) ?? []) {
      hallazgos.push({
        archivo: relative(RAIZ, ruta).split(sep).join("/"),
        linea: i + 1,
        valor: encontrado,
      });
    }
  });
}

const actualizar = process.argv.includes("--aceptar");
if (actualizar) {
  writeFileSync(BASE, JSON.stringify({ maximo: hallazgos.length }, null, 2) + "\n");
  console.log(`Marca fijada en ${hallazgos.length} literales.`);
  process.exit(0);
}

let maximo = Infinity;
try {
  maximo = JSON.parse(readFileSync(BASE, "utf-8")).maximo;
} catch {
  console.error("Falta tokens.baseline.json. Genéralo con `npm run tokens -- --aceptar`.");
  process.exit(1);
}

if (hallazgos.length > maximo) {
  console.error(
    `Regla 11: hay ${hallazgos.length} colores literales en componentes y la marca son ${maximo}.\n` +
      "Los colores viven en src/config/palette.js. Si el color no existe, agrégalo con un nombre\n" +
      "que diga para qué sirve, no qué color es.\n",
  );
  for (const h of hallazgos.slice(-40)) {
    console.error(`  ${h.archivo}:${h.linea}  ${h.valor}`);
  }
  process.exit(1);
}

if (hallazgos.length < maximo) {
  console.log(
    `Quedan ${hallazgos.length} literales (la marca eran ${maximo}).\n` +
      "Baja la marca con `npm run tokens -- --aceptar` para que no vuelva a subir.",
  );
} else {
  console.log(`Regla 11: ${hallazgos.length} literales, igual que la marca.`);
}
