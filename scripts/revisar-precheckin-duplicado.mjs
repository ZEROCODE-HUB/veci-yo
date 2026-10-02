/**
 * El precheckin del huésped vive **una sola vez**. Que no vuelva a duplicarse.
 *
 * Hasta el 02/10/2026 estaba escrito dos veces: en
 * `veci-yo/src/features/visitas/services/precheckin.repo.ts` y en
 * `veciyo-web/src/lib/precheckin.ts`. El flujo que un huésped recorre de verdad
 * es el de la **web** --sin cuenta, con el enlace que le llegó--; la copia de
 * la aplicación no la ejecutaba nadie en producción, solo las pruebas. Lo que
 * se probaba no era lo que se usaba.
 *
 * Esa copia ya había divergido tres veces sin que nada lo dijera:
 *
 *   · la fecha de nacimiento, que una mandaba y la otra no --y en la base había
 *     cero invitados con ese dato--;
 *   · el dominio del enlace final, que una sacaba de la configuración y la otra
 *     del navegador;
 *   · y los nombres de los campos de la ficha, en camello en una y como la base
 *     en la otra.
 *
 * Ahora la implementación vive solo en la web, acepta el cliente por parámetro
 * --declarado por lo que de verdad usa, no como `SupabaseClient`, porque cada
 * repositorio trae su copia del SDK y los tipos no se reconocen entre sí-- y
 * los recorridos de este repositorio llaman a esa.
 *
 * Esto vigila que no vuelva: si el repositorio de la aplicación llama otra vez
 * a una de las RPC del flujo del huésped, salta. Lo que sí es suyo --abrir el
 * preregistro y reemitir el acceso-- son cosas del anfitrión y se quedan.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");
const WEB = resolve(RAIZ, "../veciyo-web/src/lib/precheckin.ts");

/** Las RPC que solo ejecuta quien recorre el preregistro: el huésped. */
const DEL_HUESPED = [
  "consultar_precheckin",
  "guardar_precheckin",
  "aceptar_terminos_precheckin",
  "cerrar_precheckin",
  "guardar_acompanante",
  "quitar_acompanante",
  "mis_acompanantes",
  "acompanantes_del_precheckin",
];

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(nombre) && !/\.test\./.test(nombre)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const culpables = [];

for (const ruta of archivos(FUENTE)) {
  const texto = readFileSync(ruta, "utf-8");
  for (const rpc of DEL_HUESPED) {
    if (new RegExp(`rpc\\(\\s*["']${rpc}["']`).test(texto)) {
      culpables.push(`${relative(RAIZ, ruta).replace(/\\/g, "/")} → ${rpc}`);
    }
  }
}

console.log(
  `precheckin: llamadas del flujo del huesped en la aplicacion: ` +
    `${culpables.length} (tope 0).`,
);
for (const sitio of culpables) console.log(`  ${sitio}`);

/*
  Y que la implementación siga donde se dijo. Si alguien mueve o borra el módulo
  de la web, los recorridos de aquí se quedan sin lo que prueban, y conviene
  enterarse por un guarda y no por un `import` roto.
*/
if (!existsSync(WEB)) {
  console.log(
    "precheckin: no esta el proyecto de la web al lado; los recorridos del " +
      "huesped no se pueden ejecutar.",
  );
} else {
  const web = readFileSync(WEB, "utf-8");
  const faltan = DEL_HUESPED.filter(
    (rpc) =>
      !new RegExp(`rpc\\(\\s*["']${rpc}["']`).test(web) &&
      !rpc.includes("acompanante"),
  );
  if (faltan.length > 0) {
    console.error(
      `\nLa web deberia llamar a estas y no lo hace: ${faltan.join(", ")}. ` +
        `Si el flujo se movio, hay que mover tambien los recorridos.`,
    );
    process.exit(1);
  }
}

if (culpables.length > 0) {
  console.error(
    `\nEl flujo del preregistro lo ejecuta el **huesped**, en la web, sin ` +
      `cuenta. Una copia en la aplicacion no la corre nadie en produccion y ` +
      `diverge en silencio: ya paso tres veces. Si la aplicacion necesita algo ` +
      `de ese flujo, se llama al modulo de la web pasandole el cliente.`,
  );
  process.exit(1);
}
