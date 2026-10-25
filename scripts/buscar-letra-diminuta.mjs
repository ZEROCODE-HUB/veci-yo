import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Letra por debajo de 11 px.
 *
 * La auditoría de responsividad (25/10/2026) encontró leyendas, etiquetas de
 * visitas, el directorio y el Cuadro de Honor en 9 y 10 px: no se leen en un
 * teléfono. El mínimo es 11, que es `text-2xs`. Marca cualquier
 * `text-[Npx]` o `fontSize: N` con N < 11 en un componente, y comprueba que
 * `text-2xs` no haya vuelto a bajar en `tailwind.config.js`.
 *
 * Se admite donde lo pequeño es a propósito, con el motivo al lado.
 */

const RAIZ = "src";
const MINIMO = 11;
const ADMITIDOS = new Map([
  [
    "src/features/visitas/components/MarcaDeAgua.tsx",
    "la marca de agua sobre la foto del documento: no se lee, se nota",
  ],
]);

function ficheros(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.tsx$/.test(nombre) && !/\.test\.tsx$/.test(nombre) ? [ruta] : [];
  });
}

const hallazgos = [];
for (const archivo of ficheros(RAIZ)) {
  const ruta = relative(".", archivo).replaceAll("\\", "/");
  if (ADMITIDOS.has(ruta)) continue;
  readFileSync(archivo, "utf8")
    .split("\n")
    .forEach((linea, i) => {
      for (const m of linea.matchAll(/text-\[(\d+(?:\.\d+)?)px\]|fontSize:\s*(\d+(?:\.\d+)?)\b/g)) {
        const px = Number(m[1] ?? m[2]);
        if (px < MINIMO) hallazgos.push(`${ruta}:${i + 1} (${px} px)`);
      }
    });
}

const config = readFileSync("tailwind.config.js", "utf8");
const dosxs = /"2xs":\s*"(\d+)px"/.exec(config);
if (!dosxs || Number(dosxs[1]) < MINIMO) {
  hallazgos.push(`tailwind.config.js: text-2xs mide ${dosxs?.[1] ?? "?"} px`);
}

if (hallazgos.length > 0) {
  console.error(`Letra por debajo de ${MINIMO} px: ${hallazgos.length}`);
  for (const h of hallazgos) console.error(`  ${h}`);
  process.exit(1);
}
console.log(`Letra: nada por debajo de ${MINIMO} px.`);
