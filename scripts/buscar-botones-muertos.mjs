import { readFileSync, writeFileSync, existsSync } from "node:fs";

import { execSync } from "node:child_process";

/**
 * Busca controles que se pintan como pulsables y no hacen nada.
 *
 * `npm run sueltas` encuentra funciones de datos que nadie llama. Esto
 * encuentra el eslabon siguiente: el boton que esta ahi, se puede pulsar, y no
 * llama a nadie.
 *
 * Salio de un caso real. `AnuncioVotacionCard` tenia los botones «Si» y «No»
 * con `onPress={() => {}}` y las opciones eran `Pressable` sin `onPress`
 * ninguno: la tarjeta entera era decoracion y **nadie podia votar desde la
 * aplicacion**. La funcion `votar`, el hook `emitirVoto` y hasta `miVoto`
 * estaban escritos; faltaba el eslabon de en medio. `sueltas` no lo veia,
 * porque `votar` si se llamaba --desde el hook que nadie usaba--.
 *
 * Los 40 recorridos tampoco: llaman a las funciones del repositorio, no pulsan
 * botones. Este hueco solo se ve recorriendo la pantalla, o contandolo aqui.
 */

const PULSABLES = ["Pressable", "TouchableOpacity", "TouchableHighlight", "Button", "IconButton"];
const VACIOS = [
  /onPress=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/,
  /onPress=\{\s*undefined\s*\}/,
  /onPress=\{\s*\(\s*\)\s*=>\s*null\s*\}/,
  /onPress=\{\s*noop\s*\}/,
];

const MARCA = "botones.baseline.json";

function archivos() {
  const salida = execSync("git ls-files src/**/*.tsx", { encoding: "utf-8" });
  return (
    salida
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      /*
        `git ls-files` lista lo que git **conoce**, no lo que hay en el disco:
        un archivo borrado y todavía sin commitear sigue saliendo, y leerlo
        reventaba el guarda entero con un ENOENT. O sea que `npm test` no
        arrancaba, y el mensaje no decía nada del archivo que faltaba.

        Pasó el 06/10/2026 al retirar las pantallas de demostración. No es un
        caso raro: ocurre entre borrar un archivo y hacer el commit, que es
        justo cuando uno corre las pruebas.
      */
      .filter((ruta) => existsSync(ruta))
  );
}

/**
 * Los atributos de una etiqueta de apertura, desde `<Nombre` hasta el `>` que
 * la cierra. Cuenta llaves para no cortar en el `>` de una flecha (`=>`) ni en
 * el de una comparacion dentro de una expresion.
 */
function atributosDe(texto, desde) {
  let profundidad = 0;
  for (let i = desde; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === "{") profundidad += 1;
    else if (c === "}") profundidad -= 1;
    else if (c === ">" && profundidad === 0) return texto.slice(desde, i);
  }
  return texto.slice(desde, desde + 2000);
}

const hallazgos = [];

for (const ruta of archivos()) {
  const texto = readFileSync(ruta, "utf-8");
  const lineaDe = (indice) => texto.slice(0, indice).split("\n").length;

  for (const nombre of PULSABLES) {
    const apertura = new RegExp(`<${nombre}(?=[\\s/>])`, "g");
    let m;
    while ((m = apertura.exec(texto))) {
      const attrs = atributosDe(texto, m.index + nombre.length + 1);

      // Los que delegan la pulsacion a otro sitio no son botones muertos.
      if (/\.\.\.(props|rest)/.test(attrs)) continue;
      if (/\bas=\{|\bhref=|\bto=\{/.test(attrs)) continue;

      const vacio = VACIOS.find((r) => r.test(attrs));
      if (vacio) {
        hallazgos.push({ ruta, linea: lineaDe(m.index), nombre, motivo: "onPress vacio" });
        continue;
      }
      if (!/\bonPress\b|\bonLongPress\b|\bonPressIn\b/.test(attrs)) {
        hallazgos.push({ ruta, linea: lineaDe(m.index), nombre, motivo: "sin onPress" });
      }
    }
  }
}

hallazgos.sort((a, b) => a.ruta.localeCompare(b.ruta) || a.linea - b.linea);

const marca = existsSync(MARCA)
  ? JSON.parse(readFileSync(MARCA, "utf-8")).total
  : null;

if (process.argv.includes("--marcar")) {
  writeFileSync(MARCA, JSON.stringify({ total: hallazgos.length }, null, 2) + "\n");
  console.log(`Marca fijada en ${hallazgos.length}.`);
  process.exit(0);
}

for (const h of hallazgos) {
  console.log(`  ${h.ruta}:${h.linea}  <${h.nombre}>  ${h.motivo}`);
}

if (marca === null) {
  console.log(`\n${hallazgos.length} control(es) pulsables que no hacen nada. Sin marca todavia: corre con --marcar.`);
  process.exit(0);
}

if (hallazgos.length > marca) {
  console.error(
    `\nBotones muertos: ${hallazgos.length}, y la marca es ${marca}. ` +
      `Un control que se pinta como pulsable y no llama a nadie es una pantalla ` +
      `que promete algo que no hace.`,
  );
  process.exit(1);
}

console.log(
  hallazgos.length < marca
    ? `\nBotones muertos: ${hallazgos.length}, por debajo de la marca de ${marca}. Baja la marca con --marcar.`
    : `\nBotones muertos: ${hallazgos.length}, igual que la marca.`,
);
