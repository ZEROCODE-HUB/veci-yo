/**
 * Cuenta las restricciones `CHECK` creadas **NOT VALID** que nadie valida.
 *
 * `NOT VALID` le dice a Postgres «no mires las filas que ya están». Se usa para
 * no bloquear una migración con datos viejos, y está bien **mientras alguien la
 * valide después**. En este proyecto nadie lo hizo nunca: el 05/10/2026 había
 * doce así.
 *
 * Lo que deja es peor que no tener la regla. `NOT VALID` **sí** comprueba
 * cualquier UPDATE posterior sobre una fila, aunque no toque esa columna. Eso
 * dejó el perfil de Sofía --la vecina de la 102-- imposible de modificar en
 * absoluto, por un `codigo_pais = '+57'` de antes de `CampoTelefono`: no se le
 * podía cambiar ni el nombre, y el error nombraba una columna que nadie había
 * tocado.
 *
 * Dos veces la misma forma, así que se cuenta en vez de buscarse.
 *
 * ## Lo que mira, y por qué no mira la base
 *
 * Las migraciones, no el catálogo: este guarda corre en `pretest`, que no tiene
 * red. Y lo que importa ver es **la que entra nueva, el día que entra**, que es
 * justo lo que se ve en el archivo.
 *
 * Una restricción cuenta como pendiente si en algún `.sql` aparece
 * `alter table <tabla> add constraint <nombre> ... not valid` y en **ningún**
 * `.sql` aparece `alter table <tabla> validate constraint <nombre>`. Se quitan
 * antes los comentarios `--`, porque «not valid» sale mucho en las
 * explicaciones y un guarda que grita en falso se acaba ignorando.
 *
 * Se lleva la cuenta por **tabla y nombre**, no por nombre solo:
 * `codigo_pais_es_iso2` existe en seis tablas distintas, así que validar una
 * daría por validadas las otras cinco y el agujero quedaría dentro del cero.
 *
 * Lo que se admite está en `restricciones-sin-validar.baseline.json`, cada
 * entrada con su motivo. La marca es el número de entradas de ese archivo.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");
const MARCA = join(import.meta.dirname, "restricciones-sin-validar.baseline.json");

/**
 * Quita los comentarios de línea, respetando las cadenas.
 *
 * Hace falta porque un `--` dentro de una cadena no abre un comentario, y en
 * este proyecto los textos de los `comment on` llevan guiones dobles como
 * paréntesis: «--la vecina de la 102--». Sin esto, el resto del archivo
 * desaparecería del análisis a partir de ahí.
 */
function sinComentarios(sql) {
  let salida = "";
  let enCadena = null;
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    if (enCadena) {
      salida += c;
      if (c === enCadena) enCadena = null;
      continue;
    }
    if (c === "'" || c === '"') {
      enCadena = c;
      salida += c;
      continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      salida += "\n";
      continue;
    }
    salida += c;
  }
  return salida;
}

const archivos = readdirSync(MIGRACIONES)
  .filter((n) => n.endsWith(".sql"))
  .sort();

/** nombre de la restricción -> el archivo que la creó NOT VALID. */
const creadas = new Map();
const validadas = new Set();
/** Las que se crean con un nombre calculado --`%I` dentro de un `format`--. */
const sinNombre = [];

for (const nombre of archivos) {
  const sql = sinComentarios(readFileSync(join(MIGRACIONES, nombre), "utf-8"));

  const tabla = (texto) => texto.replace(/^public\./i, "").toLowerCase();

  for (const m of sql.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?(\S+)\s+validate\s+constraint\s+([a-z0-9_]+)/gi,
  )) {
    validadas.add(`${tabla(m[1])}.${m[2].toLowerCase()}`);
  }

  /*
    Y la que una migracion posterior **borra** deja de estar a medias: ya no
    existe. Es lo mismo que descuenta `npm run objetos`.

    Falta aqui desde el principio y mordio el 09/10/2026: una restriccion se
    anadio NOT VALID, se vio que dejaba una fila del cliente imposible de
    editar --que es justo lo que este guarda avisa-- y se arreglo borrandola y
    volviendola a poner **validada** en la migracion siguiente. El estado de la
    base era correcto y el guarda seguia en rojo, porque solo sabia emparejar
    `not valid` con `validate`.

    Se borra del mapa en vez de apuntarse aparte: si una migracion posterior la
    vuelve a crear NOT VALID, el `add` de abajo la mete otra vez, que es lo
    correcto. Los archivos se recorren en orden.
  */
  for (const m of sql.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?(\S+)\s+drop\s+constraint\s+(?:if\s+exists\s+)?([a-z0-9_]+)/gi,
  )) {
    creadas.delete(`${tabla(m[1])}.${m[2].toLowerCase()}`);
  }

  /*
    Desde `alter table` hasta el `;`. Se mira el final del enunciado y no la
    línea, porque un `check (...) not valid` se escribe repartido en cuatro o
    cinco líneas y el nombre está en la primera.
  */
  for (const m of sql.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?(\S+)\s+add\s+constraint\s+(\S+)([^;]*);/gi,
  )) {
    if (!/\bnot\s+valid\b/i.test(m[3])) continue;
    const bautizada = m[2].toLowerCase();
    if (/^[a-z0-9_]+$/.test(bautizada)) {
      creadas.set(`${tabla(m[1])}.${bautizada}`, nombre);
    } else {
      sinNombre.push({ archivo: nombre, nombre: m[2] });
    }
  }
}

const admitidos = JSON.parse(readFileSync(MARCA, "utf-8"));
const permitidos = new Set(admitidos.map((e) => e.restriccion));

const pendientes = [];
for (const [restriccion, archivo] of creadas) {
  if (validadas.has(restriccion)) continue;
  if (permitidos.has(restriccion)) continue;
  pendientes.push({ restriccion, archivo });
}
for (const { archivo, nombre } of sinNombre) {
  const clave = `${archivo}:${nombre}`;
  if (permitidos.has(clave)) continue;
  pendientes.push({ restriccion: clave, archivo });
}

console.log(`migraciones revisadas: ${archivos.length}`);
console.log(
  `restricciones NOT VALID creadas: ${creadas.size + sinNombre.length} · ` +
    `validadas despues: ${validadas.size}`,
);
console.log(
  `restricciones sin validar: ${pendientes.length} ` +
    `(tope ${admitidos.length}, todas con su motivo escrito).`,
);
for (const { restriccion, archivo } of pendientes) {
  console.log(`  ${restriccion}  (${archivo})`);
}

if (pendientes.length > 0) {
  console.error(
    `\nUna restriccion \`NOT VALID\` que nadie valida nunca es una bomba con ` +
      `temporizador: no comprueba las filas viejas, pero **si** comprueba ` +
      `cualquier UPDATE posterior sobre una de ellas, aunque no toque esa ` +
      `columna. Asi quedo el perfil de Sofia imposible de editar.\n` +
      `Se corrige el dato y se ejecuta \`alter table ... validate constraint ` +
      `<nombre>\` en la misma migracion o en la siguiente. Que el validate ` +
      `pase es la prueba de que no queda ninguna fila mala.\n` +
      `Si de verdad hay que dejarla a medias, va a ` +
      `\`restricciones-sin-validar.baseline.json\` con el motivo.`,
  );
  process.exit(1);
}
