/**
 * El nombre del producto, escrito de una sola manera.
 *
 * ----------------------------------------------------------------------------
 * Por qué
 * ----------------------------------------------------------------------------
 * El logotipo dice **Veciyo** y la aplicación entera decía **VeciYo**: dos
 * escrituras del mismo nombre, conviviendo en la misma pantalla —la barra
 * superior enseña el dibujo y el texto, uno al lado del otro—. Estaba anotado
 * como decisión pendiente (REVISAR-A-OJO 172) y el cliente la tomó el
 * 07/10/2026: **Veciyo**.
 *
 * Se cambiaron sesenta y cinco sitios de golpe. Sin algo que lo cuente, la
 * siguiente pantalla que alguien escriba va a traer la otra, porque «VeciYo»
 * es lo que está escrito en los comentarios, en los commits y en la cabeza de
 * cualquiera que lleve semanas en este proyecto. Y no se va a notar: es una
 * letra.
 *
 * Es el caso del que este proyecto ya tiene varios ejemplos —algo correcto en
 * un sitio y mal en otros seis, sin nada que lo vigile—. Aquí es barato
 * contarlo, así que se cuenta.
 *
 * ----------------------------------------------------------------------------
 * Qué mira
 * ----------------------------------------------------------------------------
 * Cualquier `VeciYo` con la Y mayúscula en `src/`, en las funciones y en el
 * script que sube las plantillas de correo. **También en los comentarios**: no
 * por pulcritud, sino porque el comentario es de donde se copia el texto la
 * próxima vez.
 *
 * Lo que **no** cuenta: `docs/`, `AGENTS.md` y los mensajes de commit. Son el
 * registro de lo que pasó, y lo que pasó es que antes se escribía así.
 *
 * Marca: 0.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const MIRAR = [
  join(RAIZ, "src"),
  join(RAIZ, "supabase", "functions"),
  join(RAIZ, "supabase", "herramientas"),
];
const SUELTOS = [join(RAIZ, "app.json")];
const EXTENSIONES = /\.(ts|tsx|js|jsx|mjs|json)$/;

function archivos(directorio, acumulado = []) {
  for (const nombre of readdirSync(directorio)) {
    if (nombre === "node_modules") continue;
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, acumulado);
    else if (EXTENSIONES.test(nombre)) acumulado.push(ruta);
  }
  return acumulado;
}

const revisados = [...MIRAR.flatMap((d) => archivos(d)), ...SUELTOS];
const otros = [];

for (const ruta of revisados) {
  const texto = readFileSync(ruta, "utf-8");
  if (!texto.includes("VeciYo")) continue;
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (linea.includes("VeciYo")) {
      otros.push({
        ruta: relative(RAIZ, ruta).replace(/\\/g, "/"),
        linea: i + 1,
        texto: linea.trim().slice(0, 90),
      });
    }
  });
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(`escrito «VeciYo» en vez de «Veciyo»: ${otros.length} (tope 0).`);
for (const o of otros) console.log(`  ${o.ruta}:${o.linea}  ${o.texto}`);

if (otros.length > 0) {
  console.error(
    `\nEl nombre se escribe «Veciyo», como el logotipo. Lo decidio el cliente ` +
      `el 07/10/2026 y es una sola letra de diferencia, asi que no se ve al ` +
      `revisar: por eso se cuenta.`,
  );
  process.exit(1);
}
