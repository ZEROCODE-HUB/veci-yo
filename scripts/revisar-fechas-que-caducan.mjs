/**
 * Fechas escritas a fuego que el calendario va a alcanzar.
 *
 * Una prueba que dice «dentro de unos días» con una fecha escrita a mano deja de
 * decirlo el día que esa fecha llega. Y el fallo engaña de dos maneras:
 *
 *   · si el caso es **positivo**, el disparador que impide reservar o crear una
 *     visita en el pasado la rechaza y la prueba se pone roja con un error que
 *     no menciona ninguna fecha. Parece que la rompió el último cambio;
 *   · si el caso es **negativo** —de los que esperan un rechazo— la prueba
 *     **sigue verde por el motivo equivocado**: se rechaza por la fecha y no por
 *     la política que se quería probar. Deja de proteger sin avisar.
 *
 * Las dos cosas pasaron. El 27/09/2026 había dieciséis fechas a menos de nueve
 * días, dos de ellas en casos negativos, y una prueba de componente esperaba
 * «viernes 25 de septiembre».
 *
 * Una fecha **pasada a propósito** —un reporte de 2020, una votación cerrada— no
 * es un problema: no se mueve. Lo que este script busca es lo que está a punto
 * de dejar de ser futuro.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");

/**
 * Margen de aviso, en días.
 *
 * Con sesenta hay tiempo de sobra para cambiarla sin prisa. Más corto y el aviso
 * llega cuando ya molesta; más largo y salta por fechas que son legítimamente
 * de dentro de unos meses.
 */
const MARGEN_DIAS = 60;

function archivos(directorio) {
  const salida = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(ts|tsx)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/** Las líneas que son solo comentario no llevan código que caduque. */
function esComentario(linea) {
  const limpia = linea.trim();
  return (
    limpia.startsWith("//") ||
    limpia.startsWith("*") ||
    limpia.startsWith("/*") ||
    limpia.startsWith("·")
  );
}

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const culpables = [];

for (const carpeta of [join(RAIZ, "supabase", "tests")]) {
  for (const ruta of archivos(carpeta)) {
    const lineas = readFileSync(ruta, "utf-8").split(/\r?\n/);
    let enBloque = false;
    lineas.forEach((linea, indice) => {
      // Un bloque `/* ... */` puede llevar fechas en su explicación.
      if (linea.includes("/*")) enBloque = true;
      const eraBloque = enBloque;
      if (linea.includes("*/")) enBloque = false;
      if (eraBloque || esComentario(linea)) return;
      for (const fecha of linea.match(/20\d\d-[01]\d-[0-3]\d/g) ?? []) {
        const dias = Math.round((new Date(fecha) - hoy) / 86_400_000);
        // Una fecha ya pasada se puso ahí a propósito: no se va a mover más.
        if (dias >= 0 && dias < MARGEN_DIAS) {
          culpables.push({
            ruta: relative(RAIZ, ruta),
            linea: indice + 1,
            fecha,
            dias,
          });
        }
      }
    });
  }
}

console.log(
  `fechas escritas a fuego a menos de ${MARGEN_DIAS} dias: ${culpables.length}`,
);
for (const c of culpables) {
  console.log(`  ${c.ruta}:${c.linea} — ${c.fecha}, en ${c.dias} dias`);
}

if (culpables.length > 0) {
  console.error(
    `\nUna fecha que va a dejar de ser futuro rompe la prueba que la usa --o, si ` +
      `el caso es negativo, la deja verde sin proteger nada--. Se escribe lo que ` +
      `se quiere decir: \`enDias(8)\` o \`fechaEnDias(8)\`.`,
  );
  process.exit(1);
}
