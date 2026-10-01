/**
 * Fechas y horas formateadas a mano habiendo un ayudante para eso.
 *
 * La regla 6 del proyecto prohíbe `toLocaleTimeString` y compañía --porque el
 * resultado depende del dispositivo-- y manda usar los helpers de
 * `@/shared/utils`. Pero nadie vigilaba el otro camino: construir el texto a
 * mano con `padStart`, que es determinista y por eso no levanta sospechas.
 *
 * El 01/10/2026 había **once** sitios armando `HH:mm` con su propio
 * `String(d.getHours()).padStart(2, "0")`, existiendo `formatTime` desde el
 * principio. Uno de los once se había escrito esa misma madrugada, horas antes
 * de encontrarlos: así de fácil es añadir el número doce.
 *
 * No es un defecto visible hoy --los once daban el mismo resultado-- sino la
 * forma exacta del que ya mordió a este proyecto: `seguridad.repo` escribía
 * «08:00 - 16:00» y `arquitectura.repo` «08:00 a 16:00» para el mismo turno, y
 * uno de los dos sitios que volvía a partir ese texto no funcionó nunca.
 *
 * Dos sitios que arman el mismo texto acaban armándolo distinto. La única
 * defensa es que haya un solo sitio.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/** El único sitio donde armar la fecha a mano es lo correcto. */
const PERMITIDOS = new Set([
  "src/shared/utils/date.util.ts",
  "src/shared/utils/date.util.test.ts",
]);

/** Las formas de construir una fecha o una hora a mano. */
const SEÑALES = [
  { patron: /get(Hours|Minutes|Seconds)\(\)\s*\)?\s*\.padStart/, dice: "usa formatTime(fecha)" },
  { patron: /getMonth\(\)\s*\+\s*1\s*\)?\s*\.padStart/, dice: "usa formatDate o formatDateInput" },
  { patron: /\.toLocale(Date|Time)?String/, dice: "regla 6: depende del dispositivo" },
];

const BLOQUE = /\/\*[\s\S]*?\*\//g;
const LINEA = /\/\/[^\n]*/g;

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/** Sin comentarios y con los números de línea intactos. */
function sinComentarios(texto) {
  return texto
    .replace(BLOQUE, (b) => b.replace(/[^\n]/g, " "))
    .replace(LINEA, "");
}

const revisados = archivos(FUENTE);
const culpables = [];

for (const ruta of revisados) {
  const relativa = relative(RAIZ, ruta).replace(/\\/g, "/");
  if (PERMITIDOS.has(relativa)) continue;

  const codigo = sinComentarios(readFileSync(ruta, "utf-8"));

  codigo.split("\n").forEach((linea, indice) => {
    for (const { patron, dice } of SEÑALES) {
      if (patron.test(linea)) {
        culpables.push(`${relativa}:${indice + 1} — ${dice}`);
        break;
      }
    }
  });
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(`fechas y horas armadas a mano: ${culpables.length} (tope 0).`);
for (const sitio of culpables) console.log(`  ${sitio}`);

if (culpables.length > 0) {
  console.error(
    `\nUn texto de fecha u hora se arma en **un solo sitio**: ` +
      `\`@/shared/utils\`. Dos que lo armen por su cuenta acaban armandolo ` +
      `distinto --ya paso con las horas de los turnos-- y nada lo dice.`,
  );
  process.exit(1);
}
