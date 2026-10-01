/**
 * Un servicio que finge que habla con la base.
 *
 * Es el defecto más repetido de este proyecto y el que más caro sale, porque no
 * se nota: el botón no está muerto --eso se ve-- sino que **dice que lo hizo**.
 * Quien lo pulsa no vuelve a intentarlo; espera.
 *
 * Todos tienen la misma forma, heredada del prototipo: una promesa con un
 * `setTimeout` que imita la latencia de la red, y detrás un store de Zustand en
 * lugar de una tabla. Han aparecido así, uno a uno y recorriendo pantallas:
 *
 *   · «Cambiar contraseña» y «Recuperar contraseña», que anunciaban un correo
 *     que nadie enviaba --nadie podía recuperar su cuenta en toda la app--;
 *   · los residentes de una vivienda, con alta, edición y borrado simulados;
 *   · la carga masiva de pagos;
 *   · y «Administrar mis ubicaciones» entera, con su «+ Agregar ubicación», su
 *     lápiz y su papelera, que borraba de la lista la vivienda donde uno vive y
 *     la devolvía al recargar.
 *
 * Encontrarlos a mano es irse enterando de uno en uno, que es exactamente la
 * queja del cliente el 01/10/2026: «todo el rato salen errores y errores». Esto
 * los enumera de golpe, para que la lista sea **finita y conocida** en vez de ir
 * apareciendo.
 *
 * Lo que busca: un módulo que exporta algo asíncrono, espera con un `setTimeout`
 * y no menciona a `supabase` por ningún lado.
 *
 * Lo que se admite --y por qué-- está en `servicios-que-fingen.baseline.json`,
 * cada uno con su motivo escrito. La marca es el número de entradas de ese
 * archivo: si aparece uno nuevo, falla.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");
const MARCA = join(import.meta.dirname, "servicios-que-fingen.baseline.json");

/** La espera inventada: una promesa que solo deja pasar el tiempo. */
const ESPERA_FINGIDA = [
  /setTimeout\s*\(\s*(?:\(\s*\)\s*=>\s*)?resolve/,
  /new Promise[^;]*setTimeout/,
  /SIMULATED_REQUEST_DELAY/i,
  /simularRespuesta/,
];

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const admitidos = JSON.parse(readFileSync(MARCA, "utf-8"));
const permitidos = new Set(admitidos.map((entrada) => entrada.archivo));

const revisados = archivos(FUENTE);
const culpables = [];

for (const ruta of revisados) {
  const texto = readFileSync(ruta, "utf-8");

  // Sin nada asincrono exportado no hay nada que fingir.
  if (!/export\s+(async\s+function|const\s+\w+\s*=\s*(async|<))/.test(texto)) {
    continue;
  }

  if (!ESPERA_FINGIDA.some((patron) => patron.test(texto))) continue;

  // Si habla con la base, la espera es de otra cosa --un reintento, un rebote--
  // y eso no es fingir.
  if (/supabase/.test(texto)) continue;

  const relativa = relative(RAIZ, ruta).replace(/\\/g, "/");
  if (permitidos.has(relativa)) continue;

  culpables.push(relativa);
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(
  `servicios que fingen hablar con la base: ${culpables.length} ` +
    `(tope ${admitidos.length}, todos con su motivo escrito).`,
);
for (const ruta of culpables) console.log(`  ${ruta}`);

if (culpables.length > 0) {
  console.error(
    `\nUn servicio que espera 150 ms y escribe en un store **dice que guardo ` +
      `y no guardo nada**, que es peor que un boton muerto: el boton muerto se ` +
      `nota. Si de verdad no hay donde guardarlo todavia, va a ` +
      `\`servicios-que-fingen.baseline.json\` con el motivo y su punto de ` +
      `\`docs/REVISAR-A-OJO.md\`, como \`propietario.service.ts\`.`,
  );
  process.exit(1);
}
