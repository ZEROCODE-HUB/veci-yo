/**
 * Mete las banderas de los países del catálogo dentro del proyecto.
 *
 *     node scripts/generar-banderas.mjs
 *
 * ## Por qué un archivo generado y no un paquete en tiempo de ejecución
 *
 * El 05/10/2026 las banderas salían del **código del país**: las dos letras de
 * `CO` convertidas en los dos «indicadores regionales» que el sistema dibuja
 * como 🇨🇴. Cero archivos y cero red, pero **en Windows no se ven** —ese
 * sistema no trae la fuente y Chrome pinta las dos letras—. El cliente lo
 * quiere con imagen, así que hay que traerlas.
 *
 * Se copian **al proyecto**, no se piden por red al abrir la lista: una lista
 * de países que no funciona sin conexión es peor que una sin banderas, y es el
 * mismo motivo por el que el catálogo es nuestro y no de una API.
 *
 * ## Por qué `country-flag-icons` y no `flag-icons`
 *
 * Por tamaño, y el tamaño aquí es el peso de la aplicación. Las de
 * `flag-icons` llevan el escudo dibujado entero: Bolivia pesa 103 KB, México
 * 85 KB, España 81 KB, y las veintiocho juntas pasan de medio mega **de texto
 * metido en el paquete de la app**. Las de `country-flag-icons` llevan el
 * escudo simplificado y van de 200 bytes a 1,3 KB: las veintiocho ocupan unos
 * 15 KB.
 *
 * Y a 20 píxeles de ancho, que es como se pintan, un escudo detallado es una
 * mancha de todos modos. MIT, y las banderas en sí son de dominio público.
 *
 * ## Por qué un archivo de texto y no imágenes sueltas
 *
 * Metro no sabe importar un `.svg` sin un transformador, y añadir uno cambia
 * cómo se empaqueta todo el proyecto por veintiocho dibujos. `react-native-svg`
 * ya es dependencia —la usa el código QR— y sabe pintar un SVG que llega como
 * texto. Así que el texto va en un módulo y no hay nada que configurar.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const ORIGEN = join(RAIZ, "node_modules", "country-flag-icons", "3x2");
const DESTINO = join(RAIZ, "src", "shared", "constants", "banderas.generado.ts");

/*
  Los códigos salen del catálogo, no de una lista aparte: si mañana se añade un
  país y nadie vuelve a correr esto, lo que falta se ve en el acto --la bandera
  no sale-- en vez de quedar una lista de países y otra de banderas que se
  separan en silencio. Lo comprueba también `npm run banderas`.
*/
const catalogo = readFileSync(
  join(RAIZ, "src", "shared", "constants", "paises.ts"),
  "utf-8",
);
const codigos = [...catalogo.matchAll(/codigo:\s*"([A-Z]{2})"/g)].map((m) => m[1]);
if (codigos.length === 0) throw new Error("No se encontró ningún país en paises.ts");

const entradas = [];
let bytes = 0;
for (const codigo of codigos) {
  let svg;
  try {
    svg = readFileSync(join(ORIGEN, `${codigo}.svg`), "utf-8");
  } catch {
    throw new Error(
      `No hay bandera para ${codigo}. Si el país es correcto, mira si ` +
        `country-flag-icons lo llama de otra forma.`,
    );
  }

  /*
    Se quita el `xmlns`: `SvgXml` no lo necesita y son 33 bytes por bandera.
    Y los saltos de línea, que aquí no se leen nunca.
  */
  const limpio = svg
    .replace(/\s*xmlns="[^"]*"/, "")
    .replace(/\s*\n\s*/g, "")
    .trim();
  bytes += limpio.length;
  entradas.push(`  ${codigo}: ${JSON.stringify(limpio)},`);
}

const salida = `/**
 * Las banderas de los países del catálogo, como SVG.
 *
 * **Generado. No se edita a mano:** \`node scripts/generar-banderas.mjs\`.
 * El porqué de cada decisión está en la cabecera de ese script.
 *
 * Origen: \`country-flag-icons\` (MIT), carpeta \`3x2\`, con el escudo
 * simplificado. Se pintan a unos 20 píxeles de ancho, donde un escudo detallado
 * es una mancha y pesa cincuenta veces más.
 *
 * Se usan a través de \`<Bandera />\`, que es quien las dibuja.
 */
export const BANDERAS: Record<string, string> = {
${entradas.join("\n")}
};
`;

writeFileSync(DESTINO, salida, "utf-8");
console.log(
  `${entradas.length} banderas escritas en src/shared/constants/banderas.generado.ts ` +
    `(${(bytes / 1024).toFixed(1)} KB de SVG).`,
);
