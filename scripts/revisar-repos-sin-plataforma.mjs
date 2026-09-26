/**
 * Un repositorio de datos no puede depender de la plataforma.
 *
 * Los 21 recorridos llaman a las funciones del repositorio de la aplicación
 * --a propósito: así se comprueba también el mapeo de datos-- y corren en
 * **Node**. Si un `*.repo.ts` importa `react-native` o un módulo de Expo, el
 * recorrido entero deja de arrancar.
 *
 * Pasó el 25/09/2026 con `reportes.repo`, al meterle la escritura del Excel:
 * `administracion-reporte.test.ts` murió con «Flow is not supported» al parsear
 * `node_modules/react-native/index.js`. La suite no lo dijo como una prueba
 * roja sino como un fallo de parseo de un archivo con cero pruebas, que es
 * fácil de leer como ruido --y el proceso terminó con código 0--.
 *
 * Lo que depende de la plataforma va en un módulo aparte que solo importa la
 * pantalla o el hook, como `reporteArchivo.ts`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/** Lo que no existe fuera de un dispositivo. */
const DE_PLATAFORMA = [
  /^react-native$/,
  /^react-native\//,
  /^expo-/,
  /^expo$/,
  /^@react-native-/,
  /^@expo\//,
];

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.repo\.ts$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const repos = archivos(FUENTE);
const culpables = [];

for (const ruta of repos) {
  const texto = readFileSync(ruta, "utf-8");
  const patron = /from\s+["']([^"']+)["']/g;
  let coincide;
  while ((coincide = patron.exec(texto)) !== null) {
    const especificador = coincide[1];
    if (DE_PLATAFORMA.some((p) => p.test(especificador))) {
      culpables.push({ ruta: relative(RAIZ, ruta), especificador });
    }
  }
}

console.log(`repositorios revisados: ${repos.length}`);
console.log(`con dependencias de plataforma: ${culpables.length}`);
for (const { ruta, especificador } of culpables) {
  console.log(`  ${ruta} → ${especificador}`);
}

if (culpables.length > 0) {
  console.error(
    `\nUn repositorio que importa la plataforma rompe los recorridos, que ` +
      `corren en Node y llaman a estas mismas funciones. Lo que necesita el ` +
      `dispositivo va en su propio modulo, como \`reporteArchivo.ts\`.`,
  );
  process.exit(1);
}
