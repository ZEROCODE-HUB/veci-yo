/**
 * Pantallas a las que no se puede llegar.
 *
 * Una pantalla existe para que alguien la abra. Si no está registrada en la
 * navegación, es código que nadie va a ver nunca: se mantiene, se lee, se
 * arregla y no sirve para nada.
 *
 * `buscar-archivos-huerfanos` no las encuentra, y el motivo importa: los
 * archivos que **reexportan** una carpeta entera --`screens/index.ts` con su
 * lista de `export {...} from './...'`-- cuentan como un `import` que alcanza el
 * archivo. Así que un barril mantiene viva una pantalla muerta.
 *
 * Pasó con `AdministradorZonasScreen`: 126 líneas, con su propio formulario de
 * zonas comunes --otras 190 entre el modal y la lista-- duplicando lo que hace
 * `AdministradorGestionZonasScreen`, que es la que sí está registrada. La única
 * mención en todo el proyecto era la línea del barril. Salió al preguntarse si
 * los componentes se reutilizan o se reescriben.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");

function* archivos(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (ruta.endsWith(".tsx") && !ruta.includes(".test.")) yield ruta;
  }
}

/** Lo que la navegación registra, más lo que se abre con `navigate("X")`. */
function alcanzables() {
  const nombres = new Set();
  for (const ruta of archivos(join(RAIZ, "src"))) {
    const texto = readFileSync(ruta, "utf-8");
    /*
      Se registran de tres formas distintas, y la primera versión de esto solo
      miraba una: daba diecisiete falsas alarmas, entre ellas el login y el
      perfil. Un guarda que grita en falso se acaba ignorando, que es igual de
      malo que uno que no ve nada.
    */
    // 1. `component: AlgoScreen` en la lista de rutas compartidas.
    for (const m of texto.matchAll(/component:\s*(\w+)/g)) nombres.add(m[1]);
    // 2. `component={AlgoScreen}` en un `<Stack.Screen>`.
    for (const m of texto.matchAll(/component=\{(\w+)\}/g)) nombres.add(m[1]);
    // 3. Montada a mano dentro de otra pantalla.
    for (const m of texto.matchAll(/<(\w*Screen)\b/g)) nombres.add(m[1]);
  }
  return nombres;
}

const registradas = alcanzables();
const sueltas = [];

for (const ruta of archivos(join(RAIZ, "src", "features"))) {
  const nombre = ruta.split(/[\\/]/).pop().replace(/\.tsx$/, "");
  if (!nombre.endsWith("Screen")) continue;
  // Un hook que se llama `useChatScreen` no es una pantalla.
  if (/[\\/]hooks[\\/]/.test(ruta)) continue;
  if (registradas.has(nombre)) continue;

  /*
    Una pantalla puede quedarse fuera de la navegación **a propósito**, y
    entonces lo dice en su cabecera. `ComunidadScreen` es el caso: su ruta se
    retiró el 25/09/2026 porque sus tres secciones no tienen nada detrás, y el
    archivo se conserva con el motivo escrito y lo que haría falta para
    retomarla.

    Es la misma idea que los topes de los otros guardas: se admite, pero con su
    razón al lado y no en silencio.
  */
  const cabecera = readFileSync(ruta, "utf-8").slice(0, 600);
  if (/NO EST[AÁ] EN USO/i.test(cabecera)) continue;

  sueltas.push(relative(RAIZ, ruta));
}

if (sueltas.length > 0) {
  console.error(`\n${sueltas.length} pantalla(s) a las que no se puede llegar:\n`);
  for (const s of sueltas) console.error("  " + s);
  console.error(
    "\nUna pantalla que la navegacion no registra es codigo que nadie va a ver.\n" +
      "Registrarla o quitarla. Ojo: el `index.ts` que reexporta la carpeta la\n" +
      "mantiene viva para `npm run huerfanos`, asi que ese guarda no la ve.\n",
  );
  process.exit(1);
}

console.log(`Pantallas sin registrar: 0 (de ${registradas.size} alcanzables).`);
