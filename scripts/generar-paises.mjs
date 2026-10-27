/**
 * Escribe la lista de países del mundo, con su nombre y su prefijo.
 *
 *     node scripts/generar-paises.mjs
 *
 * ## Por qué
 *
 * Hasta el 26/10/2026 la lista era nuestra y a mano: veintiocho países para el
 * teléfono y otra de ciento noventa y siete para la nacionalidad, en la web. Un
 * huésped de Japón no podía poner su teléfono, y el cliente lo dijo claro: «no
 * es mejor usar alguna lista pública de países? porque en la que teníamos no
 * estaban todos».
 *
 * ## De dónde sale
 *
 * - **Los códigos y los prefijos:** `libphonenumber-js`, que es la base de
 *   teléfonos de Google (la que usa Android). Son los 245 países y territorios
 *   que tienen numeración propia, con su código ISO 3166-1 de dos letras.
 * - **Los nombres en español:** `Intl.DisplayNames`, que son los del estándar
 *   de Unicode (CLDR). Unos pocos se acortan a como se dicen («Hong Kong» y no
 *   «RAE de Hong Kong (China)»).
 *
 * Se genera un archivo y no se pide nada al abrir la app: una lista de países
 * que no funciona sin conexión es peor que ninguna. `libphonenumber-js` es solo
 * de desarrollo; no viaja en la app.
 *
 * ## Dónde escribe
 *
 * En la app (`src/shared/constants/paises.generado.ts`) y en su gemela de la
 * web del preregistro (`../veciyo-web/src/lib/paises.generado.ts`), que no
 * comparten módulos. Las dos salen de esta misma corrida, así que no pueden
 * separarse. Después hay que correr `node scripts/generar-banderas.mjs`.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";

const RAIZ = resolve(import.meta.dirname, "..");
const DESTINOS = [
  join(RAIZ, "src", "shared", "constants", "paises.generado.ts"),
  join(RAIZ, "..", "veciyo-web", "src", "lib", "paises.generado.ts"),
];

/* Como se dicen, no como los nombra el estándar. */
const NOMBRE_CORTO = {
  HK: "Hong Kong",
  MO: "Macao",
  PS: "Palestina",
  MM: "Myanmar (Birmania)",
};

const nombres = new Intl.DisplayNames(["es"], { type: "region" });
const paises = getCountries()
  .map((codigo) => ({
    codigo,
    nombre: NOMBRE_CORTO[codigo] ?? nombres.of(codigo),
    prefijo: getCountryCallingCode(codigo),
  }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

for (const p of paises) {
  if (!/^[A-Z]{2}$/.test(p.codigo) || !p.nombre || p.nombre === p.codigo || !/^\d+$/.test(p.prefijo)) {
    throw new Error(`País sin datos completos: ${JSON.stringify(p)}`);
  }
}

const salida = `/**
 * Los países y territorios del mundo con numeración telefónica propia: código
 * ISO 3166-1 alfa-2, nombre en español y prefijo sin el «+», por orden
 * alfabético.
 *
 * **Generado. No se edita a mano:** \`node scripts/generar-paises.mjs\` en
 * \`veci-yo\`, que explica de dónde sale cada dato.
 */
export const PAISES_DEL_MUNDO: { codigo: string; nombre: string; prefijo: string }[] = [
${paises.map((p) => `  ${JSON.stringify(p)},`).join("\n")}
];
`;

for (const destino of DESTINOS) {
  if (!existsSync(resolve(destino, ".."))) throw new Error(`No existe la carpeta de ${destino}`);
  writeFileSync(destino, salida, "utf-8");
}
console.log(`${paises.length} países escritos en:\n  ${DESTINOS.join("\n  ")}`);
