import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Controles que solo llevan un icono y no dicen cómo se llaman.
 *
 * Un `Pressable` cuyo único contenido es un `Ionicons` o una `Image` no tiene
 * nombre accesible: un lector de pantalla anuncia "botón" y se acaba ahí. En
 * una pantalla con cuatro de esos, quien no ve la interfaz oye "botón, botón,
 * botón, botón".
 *
 * Salió recorriendo la aplicación como administradora: el "volver" de
 * `PageHeader` --que está en todas las pantallas-- no tenía nombre, ni las dos
 * flechas del calendario, ni los dos botones redondos de una llamada, que solo
 * se distinguen por el color. Quien no ve el color tiene una probabilidad
 * entre dos de colgar en vez de contestar.
 *
 * No cuenta los que llevan texto dentro: ese texto ya es su nombre. Tampoco
 * los que ya declaran `accessibilityLabel`.
 *
 * Es un tope, como `buscar-botones-muertos`: el número puede bajar, no subir.
 */

/*
  Estaba en 15 --los que habia el dia que se escribio este script-- y ahora en
  cero: los quince llevan nombre. Trece eran menus de tres puntos, flechas de
  volver y botones de quitar; uno era una casilla, que ademas necesita decir si
  esta marcada y con `aria-checked`, porque react-native-web no traduce
  `accessibilityState`.
*/
const TOPE = 0;

/**
 * Dónde acaba la etiqueta de apertura `<Pressable ...>`.
 *
 * No vale el primer `>`: una propiedad como `onPress={() => algo()}` lleva uno
 * dentro, y buscar el primero corta la etiqueta por la mitad y se pierde todo
 * lo que venga después --que es justo donde suele estar `accessibilityLabel`--.
 * El primer intento de este script hacía eso y daba por sin nombre a cinco
 * controles que sí lo tenían.
 */
function finDeLaApertura(texto, inicio) {
  let llaves = 0;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (c === "{") llaves++;
    else if (c === "}") llaves--;
    else if (c === ">" && llaves === 0) return i;
  }
  return texto.length;
}

function cuerpoDelPressable(texto, inicio) {
  let profundidad = 0;
  let dentro = null;
  for (let i = inicio; i < texto.length; i++) {
    if (texto.startsWith("<Pressable", i)) profundidad++;
    else if (texto.startsWith("</Pressable>", i)) {
      profundidad--;
      if (profundidad === 0) return dentro === null ? "" : texto.slice(dentro, i);
    } else if (texto[i] === ">" && dentro === null && profundidad === 1) {
      dentro = finDeLaApertura(texto, inicio) + 1;
      i = dentro - 1;
    }
  }
  return "";
}

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (ruta.endsWith(".tsx") && !ruta.includes(".test.")) yield ruta;
  }
}

const hallazgos = [];

for (const ruta of archivos("src")) {
  const texto = readFileSync(ruta, "utf-8");
  for (const coincidencia of texto.matchAll(/<Pressable\b/g)) {
    const inicio = coincidencia.index;
    const finProps = finDeLaApertura(texto, inicio);
    if (texto.slice(inicio, finProps).includes("accessibilityLabel")) continue;

    const cuerpo = cuerpoDelPressable(texto, inicio);
    if (!cuerpo.trim()) continue;

    // Un `<Text>` con letras, o una etiqueta que sale de los datos, ya nombra
    // el control.
    const llevaTexto =
      /<Text[^>]*>\s*[^<\s]/.test(cuerpo) ||
      /\{\s*\w+\.(label|titulo|nombre|texto)/.test(cuerpo);
    const soloIcono = /<(Ionicons|Image)\b/.test(cuerpo);

    if (soloIcono && !llevaTexto) {
      hallazgos.push(`${ruta}:${texto.slice(0, inicio).split("\n").length}`);
    }
  }
}

if (hallazgos.length > TOPE) {
  console.error(
    `\n${hallazgos.length} controles solo-icono sin nombre (el tope es ${TOPE}):\n`,
  );
  for (const h of hallazgos) console.error("  " + h);
  console.error(
    "\nUn control que solo lleva icono necesita `accessibilityLabel`.\n" +
      "Si de verdad hace falta subir el tope, que sea con su motivo escrito.\n",
  );
  process.exit(1);
}

console.log(
  `Controles solo-icono sin nombre: ${hallazgos.length} (tope ${TOPE}).`,
);
