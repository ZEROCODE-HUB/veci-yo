/**
 * Migraciones registradas como aplicadas a las que les falta algo.
 *
 * ----------------------------------------------------------------------------
 * Por qué existe
 * ----------------------------------------------------------------------------
 * Es la **segunda vez** que pasa lo mismo, así que deja de buscarse y se cuenta
 * (regla de AGENTS.md).
 *
 *   · La primera, en septiembre: 68 migraciones aplicadas por otra vía y sin
 *     registrar. Se comprobó a mano extrayendo los 314 objetos que crean y
 *     preguntándole al catálogo uno a uno. Salieron seis ausencias, las seis
 *     con motivo.
 *   · La segunda, el 07/10/2026, y esta era peor:
 *     `20261005160000_la_administracion_modera_y_nadie_reescribe` estaba
 *     **registrada como aplicada** y le faltaban cuatro objetos --la columna
 *     `mensaje.eliminado_por`, su índice, la política `mensaje_moderacion` y la
 *     función `retirar_mensaje`--. O sea que **nadie podía retirar un mensaje,
 *     ni el suyo**, y la administración no moderaba nada, mientras el commit de
 *     esa noche y este repositorio afirmaban que sí.
 *
 * La causa es siempre la misma y tiene nombre: **`psql` sin
 * `-v ON_ERROR_STOP=1` sigue después de un error.** Los estados que no dependen
 * del que falló se aplican, el resto no, psql termina con código 0, y entonces
 * `supabase migration repair --status applied` la da por buena. Es la hermana
 * de «una mutación que no se aplica parece una prueba robusta»: la salida decía
 * lo que pasó y nadie la miró.
 *
 * Lo que lo hace caro es que **no se parece a un fallo**. La aplicación no
 * revienta: un botón deja de funcionar en silencio, meses después, y la
 * migración que lo explica está marcada en verde.
 *
 * ----------------------------------------------------------------------------
 * Qué hace
 * ----------------------------------------------------------------------------
 * Saca de cada `.sql` los objetos que crea --tablas, columnas, funciones,
 * políticas, disparadores, índices y tipos-- y le pregunta al catálogo si
 * están. Lo que una migración posterior borra o renombra **no cuenta**: eso es
 * la mitad del trabajo y es lo que distingue este guarda de uno que grita en
 * falso.
 *
 * No va en `pretest`: necesita la base, y `npm test` corre sin red.
 *
 *     npm run objetos
 *
 * Marca 0. Si algún día una ausencia es legítima y el script no la sabe
 * deducir, se escribe aquí con su motivo, como el resto de los topes de este
 * proyecto.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");

/* ---------------------------------------------------------------------------
   Leer las migraciones
   --------------------------------------------------------------------------- */

/**
 * Fuera comentarios, respetando las cadenas.
 *
 * Los `comment on` de este proyecto usan guiones dobles como paréntesis
 * --«--la vecina de la 102--»-- así que un recorte ingenuo se come el resto del
 * archivo. Ya mordió al escribir el guarda de restricciones.
 */
function sinComentarios(sql) {
  let fuera = "";
  let i = 0;
  let enCadena = null; // "'" o "$$"
  while (i < sql.length) {
    const dos = sql.slice(i, i + 2);
    if (!enCadena && dos === "--") {
      const fin = sql.indexOf("\n", i);
      i = fin === -1 ? sql.length : fin;
      continue;
    }
    if (!enCadena && dos === "/*") {
      const fin = sql.indexOf("*/", i + 2);
      i = fin === -1 ? sql.length : fin + 2;
      continue;
    }
    const etiqueta = /^\$[a-z_]*\$/i.exec(sql.slice(i));
    if (etiqueta) {
      const marca = etiqueta[0];
      if (!enCadena) enCadena = marca;
      else if (enCadena === marca) enCadena = null;
      fuera += marca;
      i += marca.length;
      continue;
    }
    if (sql[i] === "'" && (!enCadena || enCadena === "'")) {
      enCadena = enCadena === "'" ? null : "'";
    }
    fuera += sql[i];
    i += 1;
  }
  return fuera;
}

const clave = (tipo, nombre, sobre) =>
  sobre ? `${tipo}:${sobre}.${nombre}` : `${tipo}:${nombre}`;

const creados = new Map(); // clave -> archivo que lo creó (el último)
const retirados = new Set(); // lo que una migración posterior borra o renombra
const indiceDe = new Map(); // índice -> tabla sobre la que vive

const archivos = readdirSync(MIGRACIONES)
  .filter((n) => n.endsWith(".sql"))
  .sort();

for (const archivo of archivos) {
  const sql = sinComentarios(
    readFileSync(join(MIGRACIONES, archivo), "utf-8"),
  ).toLowerCase();

  const apunta = (tipo, nombre, sobre) => {
    const k = clave(tipo, limpio(nombre), sobre ? limpio(sobre) : null);
    creados.set(k, archivo);
    retirados.delete(k);
  };
  const quita = (tipo, nombre, sobre) =>
    retirados.add(clave(tipo, limpio(nombre), sobre ? limpio(sobre) : null));

  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/g))
    apunta("tabla", m[1]);
  for (const m of sql.matchAll(/create\s+type\s+([\w.]+)/g)) apunta("tipo", m[1]);
  for (const m of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+([\w.]+)/g,
  ))
    apunta("funcion", m[1]);
  for (const m of sql.matchAll(/create\s+policy\s+([\w.]+)\s+on\s+([\w.]+)/g))
    apunta("politica", m[1], m[2]);
  for (const m of sql.matchAll(/create\s+trigger\s+([\w.]+)[\s\S]*?\son\s+([\w.]+)/g))
    apunta("disparador", m[1], m[2]);
  /*
    El indice, y **sobre que tabla**. Hace falta lo segundo: al borrar una
    tabla se van sus indices con ella, y sin esta anotacion el script los
    reclamaria para siempre. Pasa de verdad --`staff_alojamiento` se retiro el
    23/09-- y es justo la clase de falso positivo que hace que un guarda se
    acabe ignorando.
  */
  for (const m of sql.matchAll(
    /create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([\w.]+)\s+on\s+(?:only\s+)?([\w.]+)/g,
  )) {
    apunta("indice", m[1]);
    indiceDe.set(clave("indice", limpio(m[1]), null), limpio(m[2]));
  }

  /*
    Las columnas. Un `alter table X add column a, add column b` lleva la tabla
    una sola vez, así que hay que quedarse con ella y recorrer lo que sigue.
  */
  for (const m of sql.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w.]+)([\s\S]*?);/g,
  )) {
    const tabla = m[1];
    for (const c of m[2].matchAll(
      /add\s+column\s+(?:if\s+not\s+exists\s+)?([\w]+)/g,
    ))
      apunta("columna", c[1], tabla);
    for (const c of m[2].matchAll(/drop\s+column\s+(?:if\s+exists\s+)?([\w]+)/g))
      quita("columna", c[1], tabla);
    for (const c of m[2].matchAll(
      /rename\s+column\s+([\w]+)\s+to\s+([\w]+)/g,
    )) {
      quita("columna", c[1], tabla);
      apunta("columna", c[2], tabla);
    }
  }

  for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([\w.]+)/g))
    quita("tabla", m[1]);
  for (const m of sql.matchAll(/drop\s+type\s+(?:if\s+exists\s+)?([\w.]+)/g))
    quita("tipo", m[1]);
  for (const m of sql.matchAll(/drop\s+function\s+(?:if\s+exists\s+)?([\w.]+)/g))
    quita("funcion", m[1]);
  for (const m of sql.matchAll(
    /drop\s+policy\s+(?:if\s+exists\s+)?([\w.]+)\s+on\s+([\w.]+)/g,
  ))
    quita("politica", m[1], m[2]);
  for (const m of sql.matchAll(
    /drop\s+trigger\s+(?:if\s+exists\s+)?([\w.]+)\s+on\s+([\w.]+)/g,
  ))
    quita("disparador", m[1], m[2]);
  for (const m of sql.matchAll(/drop\s+index\s+(?:if\s+exists\s+)?([\w.]+)/g))
    quita("indice", m[1]);
  for (const m of sql.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?([\w.]+)\s+rename\s+to\s+([\w.]+)/g,
  )) {
    quita("tabla", m[1]);
    apunta("tabla", m[2]);
  }
  /*
    Renombrar un tipo. Dos casos reales y los dos legitimos:
    `tipo_notificacion` paso a `aviso_de_visita` porque se confundia con
    `motivo_notificacion`, y `estado_correspondencia_nuevo` es un enum de paso
    --se crea, se convierte la columna, se borra el viejo y se renombra al
    nombre final--.
  */
  for (const m of sql.matchAll(
    /alter\s+type\s+([\w.]+)\s+rename\s+to\s+([\w.]+)/g,
  )) {
    quita("tipo", m[1]);
    apunta("tipo", m[2]);
  }
  // Una tabla que se va se lleva sus indices y sus columnas.
  for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([\w.]+)/g)) {
    const tabla = limpio(m[1]);
    for (const [k, suya] of indiceDe) if (suya === tabla) retirados.add(k);
    for (const k of creados.keys()) {
      if (k.startsWith(`columna:${tabla}.`)) retirados.add(k);
    }
  }
}

/** Sin el `public.` delante y sin comillas: el catálogo los da pelados. */
function limpio(nombre) {
  return nombre.replace(/^public\./, "").replace(/"/g, "").trim();
}

/* ---------------------------------------------------------------------------
   Preguntarle al catálogo
   --------------------------------------------------------------------------- */

const env = readFileSync(join(RAIZ, ".env.local"), "utf-8");
const dato = (nombre) => env.match(new RegExp(`^${nombre}=(.+)$`, "m"))?.[1]?.trim();

/** Una consulta, por `psql`, como el resto de los scripts que miran la base. */
function preguntar(sql) {
  const psql = process.env.PSQL ?? "C:/Program Files/PostgreSQL/18/bin/psql.exe";
  return execFileSync(
    psql,
    [
      "-h", "aws-0-us-west-2.pooler.supabase.com",
      "-p", "5432",
      "-U", `postgres.${dato("SUPABASE_PROJECT_REF")}`,
      "-d", "postgres",
      "-At", "-F", "|",
      "-c", sql,
    ],
    {
      encoding: "utf-8",
      env: {
        ...process.env,
        PGPASSWORD: dato("SUPABASE_DB_PASSWORD"),
        PGCLIENTENCODING: "UTF8",
      },
    },
  )
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("|"));
}

const enLaBase = new Set();
const anotar = (filas, tipo) => {
  for (const [nombre, sobre] of filas) enLaBase.add(clave(tipo, nombre, sobre ?? null));
};

anotar(
  preguntar(
    `select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind in ('r','p')`,
  ),
  "tabla",
);
anotar(
  preguntar(
    `select t.typname from pg_type t join pg_namespace n on n.oid=t.typnamespace
     where n.nspname='public' and t.typtype='e'`,
  ),
  "tipo",
);
anotar(
  preguntar(
    `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public'`,
  ),
  "funcion",
);
anotar(
  preguntar(
    `select p.polname, c.relname from pg_policy p join pg_class c on c.oid=p.polrelid`,
  ),
  "politica",
);
anotar(
  preguntar(
    `select t.tgname, c.relname from pg_trigger t join pg_class c on c.oid=t.tgrelid
     where not t.tgisinternal`,
  ),
  "disparador",
);
anotar(
  preguntar(`select indexname from pg_indexes where schemaname='public'`),
  "indice",
);
anotar(
  preguntar(
    `select a.attname, c.relname from pg_attribute a
     join pg_class c on c.oid=a.attrelid
     join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
     where a.attnum>0 and not a.attisdropped and c.relkind in ('r','p')`,
  ),
  "columna",
);

/* ---------------------------------------------------------------------------
   Comparar
   --------------------------------------------------------------------------- */

const faltan = [];
for (const [k, archivo] of creados) {
  if (retirados.has(k)) continue;
  if (enLaBase.has(k)) continue;
  faltan.push({ objeto: k, archivo });
}
faltan.sort((a, b) => a.archivo.localeCompare(b.archivo));

console.log(`migraciones revisadas: ${archivos.length}`);
console.log(`objetos que deberian existir: ${creados.size - retirados.size}`);
console.log(`objetos que faltan en la base: ${faltan.length} (tope 0).`);
for (const f of faltan) console.log(`  ${f.objeto}  <- ${f.archivo}`);

if (faltan.length > 0) {
  console.error(
    `\nUna migracion registrada como aplicada a la que le falta algo es la peor ` +
      `forma de este defecto: la aplicacion no revienta, un boton deja de ` +
      `funcionar en silencio, y lo que lo explica esta marcado en verde.\n` +
      `Casi siempre es psql sin ON_ERROR_STOP=1, que sigue despues de un error ` +
      `y termina con codigo 0. Se vuelve a aplicar el archivo:\n` +
      `  psql ... -v ON_ERROR_STOP=1 -f supabase/migrations/<el que sea>.sql`,
  );
  process.exit(1);
}
