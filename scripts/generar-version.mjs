/**
 * Graba en la app qué versión es, cuándo se publicó y qué cambió.
 *
 * Corre en Vercel justo antes de compilar (ver `vercel.json`). Escribe
 * `src/shared/version/version.generado.ts`, que el Perfil enseña: «Versión
 * 1.0.0 (a1b2c3d) · publicada el 21/10/2026 a las 11:05» y el botón «Ver
 * últimos cambios» (pedido del 21/10/2026).
 *
 * El código del commit sale de VERCEL_GIT_COMMIT_SHA cuando Vercel publica desde
 * GitHub, de VERSION_COMMIT cuando se publica a mano con
 * `vercel deploy --build-env VERSION_COMMIT=...`, y si no hay ninguno, de git.
 * Los cambios salen de `src/shared/version/cambios.json`, escritos para quien
 * usa la app, no para quien la programa.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const paquete = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
const cambios = JSON.parse(readFileSync(join(raiz, "src/shared/version/cambios.json"), "utf8"));
/*
  El número de actualización (OTA) del celular, 22/10/2026. La versión 1.0.0
  no puede subir con cada publicación: es la que decide qué celulares reciben
  la actualización. Lo sube `scripts/publicar-ota.mjs` antes de publicar.
*/
const { numero: actualizacion } = JSON.parse(
  readFileSync(join(raiz, "src/shared/version/actualizacion.json"), "utf8"),
);

let commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERSION_COMMIT || "";
if (!commit) {
  try {
    commit = execSync("git rev-parse HEAD", { cwd: raiz }).toString().trim();
  } catch {
    commit = "";
  }
}

const contenido = `// Generado por scripts/generar-version.mjs al publicar. No se edita a mano.
export const VERSION = ${JSON.stringify(paquete.version)};
export const ACTUALIZACION = ${JSON.stringify(actualizacion)};
export const COMMIT = ${JSON.stringify(commit.slice(0, 7))};
export const PUBLICADA_EN = ${JSON.stringify(new Date().toISOString())};
export const CAMBIOS: { fecha: string; puntos: string[] }[] = ${JSON.stringify(cambios.slice(0, 15))};
`;

writeFileSync(join(raiz, "src/shared/version/version.generado.ts"), contenido);

/*
  Lo mismo, servido junto a la app: la pestaña que lleva horas abierta lo
  consulta para saber si se publicó otra versión y ofrecer recargar
  (`AvisoDeVersionNueva`). Expo copia `public/` tal cual a la publicación.
*/
mkdirSync(join(raiz, "public"), { recursive: true });
writeFileSync(
  join(raiz, "public/version.json"),
  `${JSON.stringify({ commit: commit.slice(0, 7), publicadaEn: new Date().toISOString() })}\n`,
);
console.log(`version ${paquete.version} · actualizacion ${actualizacion} (${commit.slice(0, 7) || "sin commit"})`);
