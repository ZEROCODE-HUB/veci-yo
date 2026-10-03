/**
 * Ningún campo de fecha u hora vuelve a usar el selector nativo.
 *
 * El 02/10/2026 el cliente reportó que «en muchos lugares no se abría el
 * selector de fecha». No eran muchos fallos: era **uno**, repetido dieciséis
 * veces.
 *
 * `@react-native-community/datetimepicker` **no tiene implementación en web**.
 * No existe ningún `.web.js` en el paquete, así que resuelve a
 * `src/datetimepicker.js`, que es esto entero:
 *
 *     export default function DateTimePicker(_props) {
 *       React.useEffect(() => {
 *         console.warn(`DateTimePicker is not supported on: ${Platform.OS}`);
 *       }, []);
 *       return null;
 *     }
 *
 * El síntoma es el peor posible: el `Pressable` responde, el estado cambia, el
 * componente se monta... y pinta nada. No hay error, no hay pantalla en blanco,
 * no hay nada que investigar. Simplemente no pasa nada al pulsar.
 *
 * Estaba en ocho archivos: los filtros de visitas, de correspondencia y de
 * anuncios; el formulario de un anuncio; las horas que corrige la portería en
 * una visita y en una reserva; la edición de una reserva por la administración;
 * y las cuatro horas del formulario de visita nueva.
 *
 * **Y las pruebas no podían verlo**, porque `componentes.setup.ts` doblaba el
 * paquete con `() => null`: reproducían el fallo en vez de detectarlo.
 *
 * Ahora las fechas se eligen con `CampoFecha` y las horas con `CampoHora`, que
 * son React Native puro y funcionan igual en el navegador y en el teléfono.
 * Esto vigila que nadie vuelva a traer el otro.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const culpables = [];

for (const ruta of archivos(FUENTE)) {
  const texto = readFileSync(ruta, "utf-8");
  /*
    Se busca el `import`, no la palabra: este mismo guarda y el docblock de
    `CampoHora` nombran el paquete para explicar por qué no se usa, y un guarda
    que se señala a sí mismo se acaba ignorando.
  */
  if (/^\s*import[^\n]*["']@react-native-community\/datetimepicker["']/m.test(texto)) {
    culpables.push(relative(RAIZ, ruta).replace(/\\/g, "/"));
  }
}

console.log(
  `selectores de fecha que no abren en web: ${culpables.length} (tope 0).`,
);
for (const ruta of culpables) console.log(`  ${ruta}`);

if (culpables.length > 0) {
  console.error(
    `\n\`@react-native-community/datetimepicker\` devuelve \`null\` en web: el ` +
      `campo se pulsa y no se abre nada, sin ningun error. Usa \`CampoFecha\` ` +
      `para una fecha y \`CampoHora\` para una hora, que son los que funcionan ` +
      `en el navegador y en el telefono. Si el campo vive dentro de un modal, ` +
      `pasales \`enLinea\`.`,
  );
  process.exit(1);
}
