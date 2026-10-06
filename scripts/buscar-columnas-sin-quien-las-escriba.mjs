/**
 * Columnas que existen en la base y que **nadie menciona** en la aplicación.
 *
 * Es el cruce que más defectos ha encontrado en este proyecto, y conviene
 * poder repetirlo en vez de hacerlo a mano cada vez. De aquí salieron:
 *
 *   · las ocho casillas decorativas --`restringida_huesped`, `para_residentes`,
 *     `requiere_aprobacion`, `perfil.verificado`...--, que la pantalla
 *     respetaba y la base no, o al revés;
 *   · las **nueve columnas de país** que existían y nadie llenaba, con lo que
 *     cada teléfono se guardaba sin saber de dónde era;
 *   · `suscripcion_renta_corta.ical_url`, que el anfitrión guardaba y **no
 *     leía nadie**: su calendario no estaba conectado a nada;
 *   · y `ocultar_contacto`, que la base respetaba y ningún sitio encendía.
 *
 * La forma se repite: una columna con comentario y sin nadie que la escriba es
 * **una promesa, no una función**.
 *
 * ## Cómo se usa
 *
 *     node scripts/buscar-columnas-sin-quien-las-escriba.mjs
 *
 * Necesita la base, así que **no va en `pretest`**: las comprobaciones de
 * `npm test` corren sin red. Esto se lanza a mano cuando toca mirar.
 *
 * ## Lo que no puede decidir
 *
 * Que una columna no se mencione **no la hace basura**. Hay tres motivos
 * legítimos para que esté y la aplicación no la nombre:
 *
 *   · la escribe la base --`created_at`, un disparador, una secuencia--;
 *   · la lee una función `security definer` y no el cliente;
 *   · o es de un esquema que no es nuestro.
 *
 * Por eso esto **no tiene marca ni falla**: imprime una lista para mirar. Un
 * guarda que grita en falso se acaba ignorando, y aquí el ruido es inevitable.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");

/** Lo que la base pone sola: no necesita que nadie la escriba desde la app. */
const DE_LA_BASE = /^(id|created_at|updated_at|deleted_at|.*_at)$/;

function entorno() {
  const valores = {};
  for (const linea of readFileSync(join(RAIZ, ".env.local"), "utf-8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
    const [clave, ...resto] = limpia.split("=");
    valores[clave] = resto.join("=");
  }
  return valores;
}

function columnasDeLaBase() {
  const env = entorno();
  const psql =
    process.env.PSQL ?? "C:/Program Files/PostgreSQL/18/bin/psql.exe";
  const salida = execFileSync(
    psql,
    [
      "-h", "aws-0-us-west-2.pooler.supabase.com",
      "-p", "5432",
      "-U", "postgres.qzuwnoqflaleujvlvxss",
      "-d", "postgres",
      "-At",
      "-c",
      `select table_name || '.' || column_name
         from information_schema.columns
        where table_schema = 'public'
        order by table_name, ordinal_position;`,
    ],
    {
      encoding: "utf-8",
      env: { ...process.env, PGPASSWORD: env.SUPABASE_DB_PASSWORD, PGCLIENTENCODING: "UTF8" },
    },
  );
  return salida.split("\n").map((l) => l.trim()).filter(Boolean);
}

function fuentes(directorio, acumulado = []) {
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) fuentes(ruta, acumulado);
    else if (/\.tsx?$/.test(nombre)) acumulado.push(ruta);
  }
  return acumulado;
}

const columnas = columnasDeLaBase();

/*
  Todo el código en una sola cadena, una vez. Buscar columna por columna sobre
  seiscientos archivos serían cientos de miles de lecturas.

  Se incluyen las funciones de servidor y las migraciones: una columna que
  escribe un disparador o una función `definer` **está escrita**, aunque la
  aplicación no la nombre nunca.
*/
const textos = [
  ...fuentes(join(RAIZ, "src")),
  ...fuentes(join(RAIZ, "supabase", "functions")),
]
  /*
    **El archivo de tipos generado, fuera.** Nombra **todas** las columnas de la
    base, una por una, así que con él dentro ninguna puede quedar huérfana nunca
    y esto informa «0» siempre.

    La primera versión lo incluía y dio exactamente eso: cero de ochocientas
    cuarenta. Es el mismo accidente que el guarda con dos bytes de control
    dentro, que llevaba meses diciendo «0 (tope 0)» sin mirar nada. Un cero no
    prueba nada por sí mismo.
  */
  .filter((ruta) => !ruta.endsWith("database.types.ts"))
  .map((r) => readFileSync(r, "utf-8"))
  .join("\n");

const migraciones = readdirSync(join(RAIZ, "supabase", "migrations"))
  .filter((n) => n.endsWith(".sql"))
  .map((n) => readFileSync(join(RAIZ, "supabase", "migrations", n), "utf-8"))
  .join("\n");

const huerfanas = [];
for (const completa of columnas) {
  const [tabla, columna] = completa.split(".");
  if (DE_LA_BASE.test(columna)) continue;

  // Palabra entera: `pais` no debe casar dentro de `codigo_pais`.
  const patron = new RegExp(`\\b${columna}\\b`);
  if (patron.test(textos)) continue;

  /*
    Y si una migración la menciona **fuera de su propio `create`**, es que algo
    de la base la usa: un disparador, una función, un índice. Se mira cuántas
    veces aparece: una sola es la línea que la creó.
  */
  const veces = (migraciones.match(new RegExp(`\\b${columna}\\b`, "g")) ?? []).length;
  huerfanas.push({ tabla, columna, enMigraciones: veces });
}

console.log(`columnas revisadas: ${columnas.length}`);
console.log(`sin que nadie las mencione en la aplicacion: ${huerfanas.length}\n`);

const porTabla = new Map();
for (const h of huerfanas) {
  if (!porTabla.has(h.tabla)) porTabla.set(h.tabla, []);
  porTabla.get(h.tabla).push(h);
}

for (const [tabla, lista] of [...porTabla].sort()) {
  console.log(`  ${tabla}`);
  for (const h of lista) {
    const pista =
      h.enMigraciones <= 1
        ? "  <-- ni la base la toca: mirar"
        : `  (${h.enMigraciones} menciones en migraciones)`;
    console.log(`    ${h.columna}${pista}`);
  }
}

console.log(
  `\nEsto no falla nunca: es una lista para mirar, no una marca. Una columna ` +
    `puede estar aqui con razon --la escribe un disparador, la lee una funcion ` +
    `'definer'--. Las marcadas con <-- son las que no toca nadie en ningun ` +
    `sitio, y son las que han dado defectos.`,
);
