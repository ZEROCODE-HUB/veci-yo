import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CUENTA, entrar, leer, type Sesion } from "./apoyo";

/**
 * Que las consultas que hace la aplicación le respondan.
 *
 * Nació del defecto más grande de este proyecto: el módulo de correspondencia
 * **nunca funcionó**. Su consulta pedía el nombre de quien registró cada envío
 * a través de una clave foránea que apunta a `auth.users` y no a `perfil`, así
 * que PostgREST devolvía 400. La pantalla pintaba `data ?? []` sin mirar el
 * error, de modo que un fallo de la consulta se veía **exactamente igual** que
 * un edificio sin paquetes.
 *
 * Las ocho pruebas de ese dominio pasaban, y tenían razón: las políticas
 * estaban bien. Ninguna comprobaba la **forma** de la consulta.
 *
 * Esto lo comprueba para todas: extrae cada `.from(tabla).select(...)` del
 * código y lo ejecuta. No mira los datos —de eso se encargan las demás— sino
 * que la base entienda lo que se le pide.
 */

const RAIZ = resolve(process.cwd(), "src");

interface Consulta {
  archivo: string;
  tabla: string;
  select: string;
}

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre)
      ? [ruta]
      : [];
  });
}

/** Las constantes `const X = \`...\`` del propio archivo, para resolverlas. */
function constantes(fuente: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  const patron = /const\s+(\w+)\s*=\s*`([^`]*)`/g;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = patron.exec(fuente))) {
    mapa[coincidencia[1]] = coincidencia[2];
  }
  return mapa;
}

/** El texto hasta el parentesis que cierra el `select(`, contando anidados. */
function hastaElCierre(fuente: string, desde: number): string | null {
  let profundidad = 1;
  for (let i = desde; i < fuente.length; i += 1) {
    if (fuente[i] === "(") profundidad += 1;
    else if (fuente[i] === ")") {
      profundidad -= 1;
      if (profundidad === 0) return fuente.slice(desde, i).trim();
    }
  }
  return null;
}

/**
 * El texto de un `select`, resolviendo literales, constantes del archivo y
 * concatenaciones.
 *
 * La concatenacion importa: la consulta de estacionamientos de
 * `arquitectura.repo.ts` esta partida en dos cadenas, y la primera version de
 * este barrido la saltaba en silencio. Un barrido que se salta lo que no
 * entiende dice "todo bien" sin haberlo mirado.
 */
function resolver(
  expresion: string,
  consts: Record<string, string>,
): string | null {
  const partes = expresion.split("+").map((p) => p.trim());
  const resueltas: string[] = [];
  for (const parte of partes) {
    if (/^`[^`]*`$/.test(parte) || /^"[^"]*"$/.test(parte) || /^'[^']*'$/.test(parte)) {
      resueltas.push(parte.slice(1, -1));
    } else if (consts[parte] !== undefined) {
      resueltas.push(consts[parte]);
    } else {
      // Una variable que no se puede leer del texto: mejor no comprobar nada
      // que comprobar una consulta que no es la que hace la aplicacion.
      return null;
    }
  }
  return resueltas.join("");
}

function extraer(ruta: string): Consulta[] {
  const fuente = readFileSync(ruta, "utf-8");
  const consts = constantes(fuente);
  const encontradas: Consulta[] = [];

  /*
    `.from("tabla")` y, en las siguientes líneas, el primer `.select(...)`.

    El argumento se recorta contando parentesis, no con `[^)]*`: un `select`
    con relaciones anidadas —`unidad:unidad_id ( torre:torre_id ( numero ) )`—
    tiene parentesis dentro, y cortar en el primero produce una consulta
    truncada que la base rechaza por sintaxis. La primera version de este
    barrido lo hacia asi y **acusaba de rota a una consulta que estaba bien**.
    Es el mismo error que la enumeracion de casillas cometio dos veces.
  */
  const patron = /\.from\(\s*"(\w+)"\s*\)([\s\S]{0,400}?)\.select\(/g;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = patron.exec(fuente))) {
    const [, tabla, entre] = coincidencia;
    const argumento = hastaElCierre(fuente, patron.lastIndex);
    if (argumento === null) continue;
    // Un `.from(...).insert(...)` con `.select()` detrás no es una consulta de
    // lectura; y un `.select()` vacío pide todas las columnas, que siempre vale.
    if (/\.(insert|update|upsert|delete)\(/.test(entre)) continue;
    if (!argumento.trim()) continue;

    const select = resolver(argumento.trim(), consts);
    if (select === null) continue;

    encontradas.push({
      archivo: ruta.replace(RAIZ, "src").replace(/\\/g, "/"),
      tabla,
      // `supabase-js` quita **todos** los espacios antes de enviar el
      // `select`; PostgREST no admite un espacio antes del parentesis de
      // una relacion anidada. Sin esto, el barrido acusaba de rotas a dos
      // consultas que estan bien.
      select: select.replace(/\s+/g, ""),
    });
  }
  return encontradas;
}

const consultas = ficheros(RAIZ).flatMap(extraer);

let admin: Sesion;

beforeAll(async () => {
  admin = await entrar(CUENTA.admin);
});

describe("las consultas que hace la aplicación", () => {
  it("se han encontrado suficientes como para que el barrido signifique algo", () => {
    /*
      Un control positivo del propio barrido: si el patrón dejara de encontrar
      consultas —porque cambie el estilo del código— esta prueba pasaría en
      verde sin comprobar nada, que es justo el defecto que la originó.
    */
    expect(consultas.length).toBeGreaterThan(20);
  });

  it.each(consultas.map((c) => [`${c.tabla} · ${c.archivo}`, c] as const))(
    "%s responde",
    async (_nombre, consulta) => {
      const respuesta = await leer(
        admin,
        `${consulta.tabla}?select=${encodeURIComponent(consulta.select)}&limit=1`,
      );

      // 200 con datos o sin ellos da igual: lo que se comprueba es que la base
      // entienda la consulta. Un 400 es una pantalla que se verá vacía.
      expect(
        respuesta.estado,
        `${consulta.tabla} en ${consulta.archivo}: ${JSON.stringify(respuesta.datos)}`,
      ).toBe(200);
    },
  );
});
