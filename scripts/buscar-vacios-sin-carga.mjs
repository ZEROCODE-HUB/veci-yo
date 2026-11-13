/**
 * «No hay nada» dicho antes de saberlo (13/11/2026).
 *
 * El cliente: «en muchas pantallas no hay estados de carga!! creo que eso es
 * fundamental». La revisión de ese día encontró unas noventa pantallas con el
 * mismo defecto, y la forma más cara era esta: **mientras los datos llegan,
 * la pantalla afirma que no hay ninguno** —«No hay visitas», «No tienes
 * reservas activas», «Todavía no hay nadie dado de alta»—. Quien lo lee deja
 * de esperar y se va, o peor, da de alta otra vez lo que ya estaba.
 *
 * Ya había salido suelto antes (las notificaciones, el Centro de Atención) y
 * se arregló de uno en uno. A la tercera se enumera: este guarda cuenta los
 * archivos que
 *
 *   · escriben un texto de «no hay nada» («No hay…», «No tienes…»,
 *     «Todavía no…», «Sin resultados», «Todavía nadie»), y
 *   · piden sus propios datos (llaman a un hook de datos, no solo a los de
 *     React o de navegación), y
 *   · **no mencionan en ningún sitio la carga**: ni `SegunLaCarga`, ni
 *     `<Cargando`, ni un `cargando` / `isLoading` / `estado` de la consulta.
 *
 * No prueba que la carga esté bien puesta —eso lo hacen las pruebas de cada
 * pantalla—: prueba que **alguien pensó en ella**. Un archivo que dice «no
 * hay» y no nombra la carga en ninguna parte la ha olvidado casi seguro.
 *
 * Los que la delegan con razón (el «no hay» depende de datos que el padre ya
 * esperó) van en `vacios-sin-carga.baseline.json` con su motivo al lado.
 *
 * Lo que **no** ve, y conviene saberlo para no fiarse de su cero: pasado
 * sobre el código de antes del arreglo encontró **6** de los ~90 casos de la
 * revisión. La mayoría tenían un `cargando` en el archivo —llegaba del hook—
 * y simplemente no lo usaban, o el «no hay» vivía en un hijo que recibe los
 * datos por props. Esos los cubren las pruebas de cada pantalla, que montan
 * la consulta pendiente y exigen la silueta. Este guarda caza la forma más
 * tosca: el archivo que ni siquiera nombra la carga.
 *
 * Comprobado plantándole un caso: un componente con `useAlgo()` y
 * «No hay nada» sin más se pone rojo.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUENTE = process.env.FUENTE_VACIOS ?? join(RAIZ, "src");
const MARCAS = JSON.parse(
  readFileSync(join(RAIZ, "scripts", "vacios-sin-carga.baseline.json"), "utf-8"),
);
const PERMITIDOS = new Set(Object.keys(MARCAS.permitidos ?? {}));

const VACIO = /["'`>]\s*(No hay |No tienes |Todav[ií]a no |Sin resultados|Todav[ií]a nadie)/;
const MENCIONA_LA_CARGA =
  /SegunLaCarga|<Cargando|\bcargando\w*|\bCargando\w*|isLoading|isPending|isFetched|estadoDe\(|estado\.cargando|\bcarga\b|\bcargad[oa]s?\b|\blisto\b/;

/** Hooks que no piden datos: los de React, la navegación, formularios y animación. */
const SIN_DATOS = new Set([
  "useState", "useEffect", "useMemo", "useCallback", "useRef", "useLayoutEffect",
  "useContext", "useReducer", "useId", "useTransition", "useDeferredValue",
  "useNavegacion", "useNavigation", "useRoute", "useFocusEffect", "useIsFocused",
  "useForm", "useWatch", "useController", "useFieldArray", "useFormContext",
  "useSharedValue", "useAnimatedStyle", "useWindowDimensions", "useSafeAreaInsets",
  "useUIStore", "useQueryClient", "useMutation",
]);

function archivos(directorio, acumulado = []) {
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, acumulado);
    else if (/\.tsx$/.test(nombre) && !/\.test\.tsx$/.test(nombre)) acumulado.push(ruta);
  }
  return acumulado;
}

/** Quita los comentarios: las cabeceras citan estos textos para explicarlos. */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => (l.trim().startsWith("//") ? "" : l))
    .join("\n");
}

const revisados = archivos(FUENTE);
const culpables = [];

for (const ruta of revisados) {
  const nombre = relative(RAIZ, ruta).replace(/\\/g, "/");
  const texto = sinComentarios(readFileSync(ruta, "utf-8"));
  const lineas = texto.split("\n");
  const vacios = lineas
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => VACIO.test(l));
  if (vacios.length === 0) continue;

  const hooks = [...texto.matchAll(/\b(use[A-Z]\w*)\s*\(/g)].map((m) => m[1]);
  const pideDatos = hooks.some((h) => !SIN_DATOS.has(h));
  if (!pideDatos) continue;
  if (MENCIONA_LA_CARGA.test(texto)) continue;
  if (PERMITIDOS.has(nombre)) continue;

  culpables.push({ nombre, linea: vacios[0].i + 1, texto: vacios[0].l.trim() });
}

console.log(`archivos revisados: ${revisados.length}`);
console.log(`«no hay nada» sin carga: ${culpables.length} (tope 0).`);
for (const c of culpables) console.log(`  ${c.nombre}:${c.linea}  ${c.texto.slice(0, 80)}`);

const sobrantes = [...PERMITIDOS].filter((p) => !culpables.some((c) => c.nombre === p));
if (culpables.length > 0) {
  console.error(
    "\nEstos archivos dicen que no hay nada y piden sus datos sin mencionar la carga." +
      "\nMientras los datos llegan, ese texto es falso. Envuelve la parte que depende" +
      " de ellos en `<SegunLaCarga estado={...}>` (de `@/shared/components`), o si el" +
      " padre ya esperó la carga, añade el archivo a vacios-sin-carga.baseline.json con el motivo.",
  );
  process.exit(1);
}
void sobrantes;
