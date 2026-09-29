/**
 * Controles que cambian de aspecto según su estado y no lo dicen.
 *
 * Un chip de filtro, una casilla o una pestaña que solo se distingue por el
 * color del fondo, el borde o un «✓» diminuto es invisible para quien no ve la
 * interfaz: el lector de pantalla anuncia los cuatro igual y la persona no sabe
 * por qué está filtrando.
 *
 * Es la misma familia que las ocho casillas decorativas, por el otro lado: ahí
 * la pantalla no miraba el dato, aquí el dato no llega a quien lo necesita.
 *
 * Ya apareció tres veces:
 *
 *   · `Toggle` y `Checkbox` no pasaban `aria-checked` --react-native-web 0.21 no
 *     traduce `accessibilityState`--, así que el interruptor de un permiso se
 *     anunciaba igual encendido que apagado;
 *   · `Tabs`, que es compartido, distinguía la pestaña activa con el borde y la
 *     opacidad y nada más;
 *   · los chips de correspondencia, con su propia implementación, con el color
 *     del fondo y un «✓» de diez píxeles.
 *
 * La señal que busca este script: un `Pressable` cuyo `style` o `className`
 * dependa de una condición --`sel ? ... : ...`-- y que no declare ni
 * `accessibilityState` ni `aria-checked` ni `aria-selected`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");

/**
 * Cuántos se admiten.
 *
 * Empieza en el número que había al escribirlo, como los tokens y los botones
 * muertos: puede bajar, no subir.
 */
const TOPE = Number(process.env.ESTADOS_MUDOS_TOPE ?? "0");

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (ruta.endsWith(".tsx") && !ruta.includes(".test.")) yield ruta;
  }
}

/** Dónde acaba la etiqueta de apertura, contando llaves. */
function finDeLaApertura(texto, inicio) {
  let llaves = 0;
  for (let i = inicio; i < texto.length; i++) {
    if (texto[i] === "{") llaves++;
    else if (texto[i] === "}") llaves--;
    else if (texto[i] === ">" && llaves === 0) return i;
  }
  return texto.length;
}

const hallazgos = [];

for (const ruta of archivos(join(RAIZ, "src"))) {
  const texto = readFileSync(ruta, "utf-8");
  for (const coincidencia of texto.matchAll(/<Pressable\b/g)) {
    const inicio = coincidencia.index;
    const apertura = texto.slice(inicio, finDeLaApertura(texto, inicio));

    // Ya dice en qué estado está.
    if (
      /accessibilityState|aria-checked|aria-selected|accessibilityRole="(tab|checkbox|switch|radio)"/.test(
        apertura,
      )
    ) {
      continue;
    }

    /*
      Un nombre que cambia con el estado ya lo dice: «Ocultar los filtros» y
      «Ver los filtros» comunican lo mismo que un `aria-expanded`, y mejor.
    */
    if (/accessibilityLabel=\{[^}]*\?/.test(apertura)) continue;

    /*
      Y una pista condicional tambien: cuando lo que el color comunica no es
      «elegido» sino un motivo --«hace falta un paquete de huespedes»-- eso se
      cuenta, no se marca con un estado.
    */
    if (/accessibilityHint=\{[^}]*\?/.test(apertura)) continue;

    /*
      Un ternario dentro de `style` o `className` significa que el control se
      pinta distinto según algo. Se pide que ese algo se pueda oír.
    */
    /*
      `onSelect` no es un estado: es el manejador. Se quita antes de buscar la
      palabra, porque casaba con «sel» y daba por muda la lista de conversaciones
      del chat, cuyo unico ternario es el **tipo** de conversacion.
    */
    /*
      Y una **comparación** también es un estado. Los dos botones de «Tipo de
      notificación» se pintan con `aviso === op.id`, sin ninguna de las
      palabras de abajo, así que este script los daba por buenos mientras en el
      DOM no llevaban ni `role` ni `aria-checked`: lo único que decía cuál
      estaba elegido era el color. Salió recorriendo el alta de una visita.

      Es el patrón de un grupo de opciones pintado con `.map`, que es la forma
      normal de escribir unos radios en React Native.
    */
    /*
      `active:` es el pseudo-estado de NativeWind para mientras se pulsa
      --`active:opacity-70`--, no un estado de seleccion. Casaba con «activ» y
      marcaba el boton de «Marcar Comité de Propietarios», cuyo texto **ya dice
      en qué estado está**: cambia a «Quitar de Comité».
    */
    const limpia = apertura
      .replace(/onSelect|onSeleccion/g, "")
      .replace(/active:[\w-]+/g, "");
    const pintaSegunEstado =
      /(style|className)=\{[^]*?\?[^]*?:/.test(apertura) &&
      (/(\bactiv|\bsel\w*\s*[?=]|isSelected|seleccionad|checked|marcad|elegid|abiert)/i.test(
        limpia,
      ) ||
        /(style|className)=\{[^]*?\w+\s*===\s*[\w.]+[^]*?\?/.test(limpia));

    if (pintaSegunEstado) {
      hallazgos.push(
        `${relative(RAIZ, ruta)}:${texto.slice(0, inicio).split("\n").length}`,
      );
    }
  }
}

console.log(`controles que no dicen su estado: ${hallazgos.length} (tope ${TOPE}).`);
if (hallazgos.length > TOPE) {
  console.error("");
  for (const h of hallazgos) console.error("  " + h);
  console.error(
    "\nUn control que cambia de aspecto segun su estado tiene que decirlo:\n" +
      "`accessibilityState` **y** `aria-checked` o `aria-selected`, porque\n" +
      "react-native-web no traduce el primero.\n",
  );
  process.exit(1);
}
