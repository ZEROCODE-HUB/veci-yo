/**
 * Cuenta las funciones de la base que preguntan qué día es con el reloj de
 * Londres.
 *
 * `current_date` es el día de la sesión de la base, y en Supabase la sesión va
 * en UTC: en Colombia, de 7 de la noche a medianoche, ya es «mañana». Mordió
 * primero en las pruebas, después en `resumen_de_mis_viviendas`, después en las
 * cuotas, y el 25/10/2026 se contaron treinta y cuatro funciones así --entre
 * ellas `es_huesped_alojado`, que le quitaba el acceso al huésped el día de su
 * salida desde las 7 de la noche--. Se arreglaron en
 * `20261025210000_hoy_es_el_dia_del_edificio.sql` y desde entonces se cuentan.
 *
 * Lo que hay que usar: `hoy_en_el_edificio(condominio)`,
 * `hoy_en_la_unidad(unidad)`, `hoy_en_el_pais(pais)` o, para lo que no es de
 * ningún edificio, `hoy_en_la_plataforma()`. Y para pasar un día a instante,
 * `medianoche_en_el_edificio`, no `fecha::timestamptz`.
 *
 * ## Lo que mira
 *
 * Las migraciones, no el catálogo: corre en `pretest`, sin red. Para cada
 * función se queda con **la última** definición (por orden de archivo), que es
 * la que vive en la base, y busca en su cuerpo `current_date`, `now()::date` o
 * `localtimestamp`. Se quitan antes los comentarios: muchas explican
 * justamente por qué no se usa `current_date`.
 *
 * Una función borrada después (`drop function`) deja de contar.
 *
 * Lo admitido va en `ADMITIDAS`, con su motivo.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");

const ADMITIDAS = {
  // Convierte la hora de una tarea (de la zona de la plataforma) a la hora UTC
  // de pg_cron. Necesita un día cualquiera para el cambio de zona; no pregunta
  // qué día es.
  reprogramar_tareas: "convierte una hora a UTC, no pregunta qué día es",
};

const PROHIBIDO = /\bcurrent_date\b|\bnow\s*\(\s*\)\s*::\s*date\b|\blocaltimestamp\b/i;

/** Quita los comentarios `--` y `/* *\/`, respetando las cadenas. */
function sinComentarios(sql) {
  let salida = "";
  let enCadena = false;
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    if (enCadena) {
      salida += c;
      if (c === "'") enCadena = false;
      continue;
    }
    if (c === "'") {
      enCadena = true;
      salida += c;
      continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      salida += "\n";
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      const fin = sql.indexOf("*/", i + 2);
      i = fin === -1 ? sql.length : fin + 1;
      salida += " ";
      continue;
    }
    salida += c;
  }
  return salida;
}

const archivos = readdirSync(MIGRACIONES)
  .filter((n) => n.endsWith(".sql"))
  .sort();

/** nombre de la función → { archivo, cuerpo } de su última definición. */
const ultimas = new Map();
const CREA = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
const BORRA = /drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi;

for (const archivo of archivos) {
  const sql = readFileSync(join(MIGRACIONES, archivo), "utf8");
  const sucesos = [];
  for (const m of sql.matchAll(CREA)) sucesos.push({ pos: m.index, nombre: m[1].toLowerCase(), crea: true });
  for (const m of sql.matchAll(BORRA)) sucesos.push({ pos: m.index, nombre: m[1].toLowerCase(), crea: false });
  sucesos.sort((a, b) => a.pos - b.pos);

  for (const s of sucesos) {
    if (!s.crea) {
      ultimas.delete(s.nombre);
      continue;
    }
    // El cuerpo va entre dos marcas de dólar iguales: `as $$ ... $$` o
    // `as $function$ ... $function$`.
    const resto = sql.slice(s.pos);
    const apertura = resto.match(/\bas\s+(\$\w*\$)/i);
    if (!apertura) continue;
    const desde = apertura.index + apertura[0].length;
    const hasta = resto.indexOf(apertura[1], desde);
    if (hasta === -1) continue;
    ultimas.set(s.nombre, { archivo, cuerpo: resto.slice(desde, hasta) });
  }
}

const malas = [];
for (const [nombre, { archivo, cuerpo }] of ultimas) {
  if (nombre in ADMITIDAS) continue;
  const limpio = sinComentarios(cuerpo);
  const m = limpio.match(PROHIBIDO);
  if (m) malas.push(`  ${nombre}  (${archivo}): «${m[0]}»`);
}

if (malas.length > 0) {
  console.error(
    `\n✗ ${malas.length} función(es) cuentan el día con el reloj de Londres:\n` +
      malas.sort().join("\n") +
      "\n\n  Usa hoy_en_el_edificio(condominio), hoy_en_la_unidad(unidad),\n" +
      "  hoy_en_el_pais(pais) o hoy_en_la_plataforma(). Lo explica\n" +
      "  scripts/buscar-dias-de-londres.mjs.\n",
  );
  process.exit(1);
}
console.log(`✓ dias: ninguna función cuenta el día con el reloj de Londres (${ultimas.size} miradas)`);
