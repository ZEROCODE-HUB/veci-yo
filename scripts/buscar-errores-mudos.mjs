/**
 * Un `instanceof Error` que tira el motivo del fallo.
 *
 * Lo que lanza el cliente de Supabase **no es un `Error`**: es un objeto plano
 * `{ message, details, hint, code }`. Así que `error instanceof Error ?
 * error.message : respaldo` da siempre el respaldo, y la frase que la base
 * escribió para que alguien la lea se pierde por el camino.
 *
 * Lo que sí son `Error` son los fallos de autenticación y los que lanza la
 * propia aplicación, y por eso nadie lo notó: unas pantallas explicaban el
 * motivo y otras no, sin que se viera el patrón.
 *
 * Salió el 01/10/2026 votando dos veces la misma opción de una encuesta. La
 * base contesta «Esta encuesta admite un solo voto por persona» y en pantalla
 * salía «No se pudo guardar el anuncio»: ni el motivo ni el asunto. Al buscar
 * el patrón aparecieron **veinte sitios iguales**, incluido uno donde la frase
 * útil --«este edificio no autoriza la renta corta»-- no podía salir nunca.
 *
 * Para eso está `mensajeDeError` en `shared/utils/error.util.ts`, que ya
 * existía desde antes y usaban cinco archivos de veinticinco. El problema no
 * era que faltara la herramienta: era que no había nada que avisara de quién no
 * la usaba.
 *
 * Esto es lo que avisa. Es la misma idea que `npm run fingen`: a la segunda vez
 * que un defecto aparece con la misma forma se deja de buscar y se cuenta.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/** El único sitio donde la comprobación es correcta: la propia herramienta. */
const PERMITIDOS = new Set([
  "src/shared/utils/error.util.ts",
  "src/shared/utils/error.util.test.ts",
]);

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

/**
 * El archivo sin comentarios, y con los números de línea intactos.
 *
 * Mirar si la línea empieza por `*` no basta: la primera versión de este guarda
 * señalaba una explicación de varias líneas que menciona el patrón justo para
 * contar por qué está mal, que es lo que no hay que tocar. Los comentarios se
 * sustituyen por espacios, conservando los saltos.
 */
function sinComentarios(texto) {
  return texto
    .replace(BLOQUE, (bloque) => bloque.replace(/[^\n]/g, " "))
    .replace(LINEA, "");
}

const revisados = archivos(FUENTE);
const culpables = [];

for (const ruta of revisados) {
  const relativa = relative(RAIZ, ruta).replace(/\\/g, "/");
  if (PERMITIDOS.has(relativa)) continue;

  const codigo = sinComentarios(readFileSync(ruta, "utf-8"));

  codigo.split("\n").forEach((linea, indice) => {
    if (/instanceof Error/.test(linea)) {
      culpables.push(`${relativa}:${indice + 1}`);
    }
  });
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(`errores que pierden su motivo: ${culpables.length} (tope 0).`);
for (const sitio of culpables) console.log(`  ${sitio}`);

if (culpables.length > 0) {
  console.error(
    `\nLo que lanza Supabase no es un \`Error\`, asi que \`instanceof Error\` ` +
      `descarta justo el mensaje que explica el fallo. Usa ` +
      `\`mensajeDeError(error, respaldo)\` de \`@/shared/utils/error.util\`, ` +
      `que mira las tres formas en que puede llegar.`,
  );
  process.exit(1);
}
