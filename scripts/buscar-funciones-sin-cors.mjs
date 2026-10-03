/**
 * Ninguna funcion que llame el navegador se queda sin CORS.
 *
 * Una funcion de Supabase desplegada **no es una funcion llamable**. Si la
 * llama una pagina web con `Content-Type: application/json`, el navegador manda
 * antes un `OPTIONS`; si la funcion contesta «Metodo no permitido» --que es lo
 * que hace cualquier `if (req.method !== "POST")`-- la llamada muere ahi.
 *
 * Y muere de la peor forma: lo que llega al codigo es `Failed to fetch`, sin
 * estado, sin cuerpo y sin motivo. No se parece a un problema de permisos; se
 * parece a que no hay internet.
 *
 * Paso dos veces, y la segunda lo destapo:
 *
 *   · `subir-autorizacion-menor`, escrita el 03/10/2026, fallo al primer
 *     intento desde la pantalla.
 *   · `subir-documento-precheckin`, que se dio por **resuelta el 02/10** --se
 *     escribio, se desplegio, se reviso la logica-- y nunca llego a subir una
 *     foto desde el navegador, que es el unico sitio desde el que alguien la
 *     sube.
 *
 * O sea: la pieza existia, era correcta, y nadie pulso el boton. Es el defecto
 * de siempre de este proyecto, esta vez del lado del servidor.
 *
 * Lo que mira: toda funcion que rechace metodos --sintoma seguro de que espera
 * un POST-- tiene que responder tambien al `OPTIONS`.
 *
 *   node scripts/buscar-funciones-sin-cors.mjs
 *
 * Tope: 0.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..", "supabase", "functions");
const TOPE = 0;

/*
  Las que no atiende un navegador se saltan diciendolo. `_compartido` no es una
  funcion: son los modulos que las demas importan.
*/
const FUERA = new Set(["_compartido"]);

const hallazgos = [];

for (const nombre of readdirSync(RAIZ)) {
  if (FUERA.has(nombre)) continue;

  const ruta = join(RAIZ, nombre, "index.ts");
  if (!existsSync(ruta)) continue;

  const codigo = readFileSync(ruta, "utf-8");

  // Si no filtra por metodo, no va a tropezar con el preflight.
  if (!/req\.method\s*!==?\s*"POST"/.test(codigo)) continue;

  /*
    Solo la llamada, no la palabra. La primera version admitia cualquier
    `"OPTIONS"` en el archivo, y al plantarle un caso --quitarle el preflight a
    una funcion arreglada-- **siguio dando el mismo numero**: le bastaba el
    comentario que explica el asunto. Un guarda que casa con la documentacion
    de su propio defecto no sirve para nada.
  */
  const atiendePreflight =
    /responderPreflight\s*\(/.test(codigo) ||
    /req\.method\s*===?\s*"OPTIONS"/.test(codigo);

  if (!atiendePreflight) hallazgos.push(nombre);
}

for (const h of hallazgos) console.log(`${h}: espera un POST y no responde al OPTIONS`);
console.log(`\nfunciones que el navegador no puede llamar: ${hallazgos.length} (tope ${TOPE})`);

if (hallazgos.length > TOPE) {
  console.error(
    "\nUna funcion que rechaza metodos tiene que responder primero al `OPTIONS`.\n" +
      "Hay un modulo para eso: `_compartido/cors.ts`.\n" +
      "  const previo = responderPreflight(req);\n" +
      "  if (previo) return previo;",
  );
  process.exit(1);
}
