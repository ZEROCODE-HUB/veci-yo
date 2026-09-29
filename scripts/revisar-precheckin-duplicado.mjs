/**
 * El precheckin está escrito dos veces. Que no divergan sin avisar.
 *
 * `src/features/visitas/services/precheckin.repo.ts` (la app) y
 * `../veciyo-web/src/lib/precheckin.ts` (la web) llaman a las mismas funciones
 * de la base. El flujo que un huésped recorre de verdad es el de la **web**; la
 * app solo usa dos de esas llamadas --emitir y reemitir el enlace-- y el resto
 * es una copia que en producción no se ejecuta, aunque sí la ejercitan los
 * recorridos de prueba.
 *
 * Unificarlas de verdad --un paquete compartido-- obliga a tocar el empaquetado
 * de los dos proyectos: la app va con Metro y guarda la sesión con el
 * almacenamiento de React Native, la web va con Vite. Mientras eso no se haga,
 * el riesgo real es que una cambie y la otra no, y que la suite siga en verde
 * porque prueba la de la app.
 *
 * Esto compara las dos: qué RPC llama cada una y con qué parámetros. Si una
 * gana un argumento, lo pierde, o deja de llamar a algo, salta.
 *
 * Lo que **no** compara es lo que cada una hace alrededor de la llamada. Ahí ya
 * hay una diferencia conocida y anotada: al cerrar el preregistro, la app envía
 * el correo con el acceso del huésped y la web no --ver `REVISAR-A-OJO.md`--.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const APP = resolve(RAIZ, "src/features/visitas/services/precheckin.repo.ts");
const WEB = resolve(RAIZ, "../veciyo-web/src/lib/precheckin.ts");

if (!existsSync(WEB)) {
  console.log(
    "precheckin: no está el proyecto de la web al lado, no hay nada que comparar.",
  );
  process.exit(0);
}

/** Las RPC de un archivo, con los parámetros de cada llamada. */
function llamadas(ruta) {
  const texto = readFileSync(ruta, "utf-8");
  const encontradas = new Map();
  // `rpc('nombre', { p_uno: ..., p_dos: ... })`
  for (const m of texto.matchAll(
    /\.rpc\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g,
  )) {
    const nombre = m[1];
    const params = [...m[2].matchAll(/(p_\w+)\s*:/g)].map((p) => p[1]).sort();
    encontradas.set(nombre, params);
  }
  return encontradas;
}

const app = llamadas(APP);
const web = llamadas(WEB);
const problemas = [];

for (const [nombre, params] of web) {
  if (!app.has(nombre)) continue; // La web llama a más cosas; eso es esperable.
  const suyos = app.get(nombre);
  const soloWeb = params.filter((p) => !suyos.includes(p));
  const soloApp = suyos.filter((p) => !params.includes(p));
  if (soloWeb.length || soloApp.length) {
    problemas.push(
      `${nombre}: la web pasa [${soloWeb.join(", ") || "—"}] que la app no, ` +
        `y la app pasa [${soloApp.join(", ") || "—"}] que la web no`,
    );
  }
}

const compartidas = [...web.keys()].filter((n) => app.has(n));

if (problemas.length > 0) {
  console.error(
    `\nLas dos copias del precheckin ya no coinciden (${problemas.length}):\n`,
  );
  for (const p of problemas) console.error("  " + p);
  console.error(
    "\nLas dos llaman a la misma base. Si una manda un argumento que la otra\n" +
      "no, el flujo real --el de la web-- hace algo distinto de lo que prueban\n" +
      "los recorridos, y la suite sigue en verde. Igualarlas, o unificarlas.\n",
  );
  process.exit(1);
}

console.log(
  `precheckin: ${compartidas.length} llamadas compartidas, todas con los mismos argumentos.`,
);
