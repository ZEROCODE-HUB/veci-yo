/**
 * Campos de formulario que **no enseñan por qué se rechazó lo que escribiste**.
 *
 * De 104 campos con validación, **73 estaban así**: el esquema rechazaba,
 * `handleSubmit` no llamaba a guardar, y la pantalla no pintaba nada. Pulsabas
 * «Guardar» y no pasaba absolutamente nada.
 *
 * Es la peor cara del defecto que este proyecto ya conoce —un botón que parece
 * muerto— con un agravante: aquí el botón funciona, y es la persona la que no
 * tiene forma de saber qué le falta. Quien lo pulsa dos veces y no ve nada
 * concluye que la aplicación está rota.
 *
 * Lo pidió el cliente el 06/10/2026: «que todos los formularios se validen
 * correctamente... y las notificaciones de error y todo eso».
 *
 * ## Qué mira
 *
 * Cada `<Controller>` que pinta un control capaz de enseñar un error —`Input`,
 * `CampoTelefono`, `CampoFecha`, `CampoPais`— y no le pasa `error`.
 *
 * Lo que **no** mira: un `Controller` sobre un `Toggle`, un `Checkbox` o un
 * `Select`. Un interruptor no tiene nada que validar, y un `Select` solo ofrece
 * valores válidos. Meterlos daría ruido y un guarda ruidoso se acaba ignorando.
 *
 * Y tampoco mira si el **esquema** trae mensajes: un campo puede enseñar el
 * error de zod en inglés y este guarda lo daría por bueno. Eso no se puede
 * contar sin leer cada `.min()` y decidir si su texto es útil, así que se queda
 * en la revisión de quien escribe el esquema. El de coadministradores no los
 * tenía y se vio justo al enseñar los errores por primera vez.
 *
 * Marca: 0.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const FUENTE = join(RAIZ, "src");

/** Los que aceptan `error` y lo pintan debajo del campo. */
const CONTROLES = ["Input", "CampoTelefono", "CampoFecha", "CampoPais"];

function archivos(directorio, acumulado = []) {
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, acumulado);
    else if (/\.tsx$/.test(nombre) && !/\.test\.tsx$/.test(nombre)) {
      acumulado.push(ruta);
    }
  }
  return acumulado;
}

/**
 * El bloque de un `<Controller ... />`, contando llaves.
 *
 * Contando y no con una expresión regular: dentro hay funciones flecha, objetos
 * y ternarias, y el primer `/>` que aparece casi nunca es el suyo.
 */
function bloqueDesde(texto, inicio) {
  let profundidad = 0;
  for (let i = inicio; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === "{") profundidad += 1;
    else if (c === "}") profundidad -= 1;
    else if (texto.slice(i, i + 2) === "/>" && profundidad === 0) {
      return texto.slice(inicio, i + 2);
    }
  }
  return null;
}

const revisados = archivos(FUENTE);
const mudos = [];
let total = 0;

const patronControl = new RegExp(`<(${CONTROLES.join("|")})\\b`);

for (const ruta of revisados) {
  const texto = readFileSync(ruta, "utf-8");
  if (!texto.includes("<Controller")) continue;

  for (const m of texto.matchAll(/<Controller\b/g)) {
    const bloque = bloqueDesde(texto, m.index);
    if (!bloque || !patronControl.test(bloque)) continue;
    total += 1;
    if (!bloque.includes("error=")) {
      mudos.push({
        ruta: relative(RAIZ, ruta).replace(/\\/g, "/"),
        linea: texto.slice(0, m.index).split("\n").length,
      });
    }
  }
}

console.log(`campos de formulario revisados: ${total}`);
console.log(`campos que no enseñan su error: ${mudos.length} (tope 0).`);
for (const c of mudos) console.log(`  ${c.ruta}:${c.linea}`);

if (mudos.length > 0) {
  console.error(
    `\nUn campo que se valida y no dice nada deja a la persona pulsando ` +
      `«Guardar» sin que pase nada. Se arregla pasando el error al control:\n` +
      `  render={({ field, fieldState }) => (\n` +
      `    <Input ... error={fieldState.error?.message} />\n` +
      `  )}\n` +
      `Y mira de paso que el esquema traiga el mensaje en castellano: sin el, ` +
      `lo que se lee es el de zod, en ingles.`,
  );
  process.exit(1);
}
