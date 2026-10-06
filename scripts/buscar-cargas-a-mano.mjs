/**
 * Pantallas que se inventan su propio «cargando».
 *
 * No existía un componente de carga, así que cada una hacía la suya: ocho
 * `ActivityIndicator size="large"` copiados y textos sueltos que decían
 * «Cargando…», «Cargando...», «Cargando zonas...» y «Cargando tu alojamiento…».
 * Cuatro formas de escribir lo mismo.
 *
 * Y debajo había algo peor que la inconsistencia. **Sin un estado de carga, lo
 * que una pantalla enseña mientras no hay datos es lo que haya en el almacén**,
 * y el de viviendas arrancaba con dos casas inventadas. Al abrir la aplicación
 * se veía, durante un parpadeo, la casa de nadie.
 *
 * Lo pidió el cliente el 06/10/2026: «quiero que te asegures que ese componente
 * de carga esté en toda la app».
 *
 * ## Qué cuenta, y qué no
 *
 * Cuenta dos cosas, las dos fuera de `Cargando.tsx`:
 *
 *   · un `ActivityIndicator` suelto;
 *   · y un texto que empieza por «Cargando».
 *
 * **No cuenta el `ActivityIndicator` de `Button.tsx`**, que es otra cosa: la
 * rueda pequeña dentro de un botón mientras se guarda. Eso no es un estado de
 * la pantalla, es el botón diciendo que está ocupado, y tiene su propio `prop`.
 *
 * Tampoco cuenta las pruebas: una que comprueba un texto de carga necesita
 * escribirlo.
 *
 * Marca: 0.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/**
 * Los que pueden tener una rueda con razón.
 *
 * `Cargando.tsx` es el componente. `Button.tsx` la lleva dentro del botón, que
 * es un estado del control y no de la pantalla.
 */
const PERMITIDOS = ["Cargando.tsx", "Button.tsx"];

function archivos(directorio, acumulado = []) {
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, acumulado);
    else if (/\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre)) {
      acumulado.push(ruta);
    }
  }
  return acumulado;
}

const revisados = archivos(FUENTE);
const culpables = [];

for (const ruta of revisados) {
  if (PERMITIDOS.some((p) => ruta.endsWith(p))) continue;

  const lineas = readFileSync(ruta, "utf-8").split(/\r?\n/);
  lineas.forEach((linea, indice) => {
    const limpia = linea.trim();
    // Los comentarios no: esta misma cabecera cita el patrón para explicarlo,
    // y un guarda que grita en falso se acaba ignorando.
    if (limpia.startsWith("*") || limpia.startsWith("//")) return;

    if (/<ActivityIndicator/.test(linea)) {
      culpables.push({ ruta, linea: indice + 1, que: "rueda suelta" });
    }
    // Un texto de carga escrito a mano. `<Cargando` no casa: lleva mayúscula
    // pegada a `<`, y lo que se busca es la palabra entre comillas.
    if (/["'`]\s*Cargando[^"'`]*["'`]/.test(linea)) {
      culpables.push({ ruta, linea: indice + 1, que: "texto a mano" });
    }
  });
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(`cargas escritas a mano: ${culpables.length} (tope 0).`);
for (const c of culpables) {
  console.log(`  ${relative(RAIZ, c.ruta).replace(/\\/g, "/")}:${c.linea}  ${c.que}`);
}

if (culpables.length > 0) {
  console.error(
    `\nHay un componente para esto: \`<Cargando />\`, de \`@/shared/components\`.` +
      `\nUsarlo no es cosmetica: sin un estado de carga, lo que la pantalla ` +
      `enseña mientras no hay datos es lo que haya en el almacen, y asi es como ` +
      `la aplicacion llego a enseñar dos casas inventadas al arrancar.` +
      `\nY si lo que hace falta es la rueda **dentro de un boton**, eso es ` +
      `\`<Button loading />\`, que es otra cosa.`,
  );
  process.exit(1);
}
