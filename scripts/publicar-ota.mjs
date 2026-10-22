/**
 * Publica una actualización por el aire (OTA) y avisa a todos.
 *
 *   npm run ota
 *
 * Pedido del 22/10/2026: «ni bien se publique un OTA, a todos los dispositivos
 * se envíe una notificación push indicando el número de versión nuevo, para
 * que los testers ya sepan que se actualizó».
 *
 * En orden, y parando en el primer fallo:
 *   1. Sube el número de actualización (`src/shared/version/actualizacion.json`).
 *   2. Graba la versión con `generar-version.mjs` (el Perfil la enseña).
 *   3. Publica con `eas update` en el canal «pruebas».
 *   4. Comprueba que lo publicado lleva la dirección de Supabase: la primera
 *      publicación salió sin ella (las EXPO_PUBLIC_* salen del entorno
 *      «preview» de EAS, no de `.env.local`) y la app no habría entrado.
 *   5. Llama a `avisar_app_actualizada`, que deja un aviso a cada persona y el
 *      disparador lo manda como push: «Veciyo se actualizó (actualización N)»,
 *      con la primera novedad de `cambios.json`.
 *
 * Si falla antes de publicar, el número vuelve al que tenía.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const archivoNumero = join(raiz, "src/shared/version/actualizacion.json");

function entorno() {
  const valores = {};
  for (const linea of readFileSync(join(raiz, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) valores[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return valores;
}

const { numero: anterior } = JSON.parse(readFileSync(archivoNumero, "utf8"));
const numero = anterior + 1;
const cambios = JSON.parse(readFileSync(join(raiz, "src/shared/version/cambios.json"), "utf8"));
const novedad = cambios[0]?.puntos?.[0] ?? "";

const correr = (comando) => execSync(comando, { cwd: raiz, stdio: "inherit" });

writeFileSync(archivoNumero, `${JSON.stringify({ numero }, null, 2)}\n`);
try {
  correr("node scripts/generar-version.mjs");
  const mensaje = `Actualizacion ${numero}${novedad ? `: ${novedad}` : ""}`.replace(/"/g, "'");
  correr(
    `npx eas update --branch pruebas --platform android --environment preview --non-interactive --message "${mensaje}"`,
  );
} catch (e) {
  writeFileSync(archivoNumero, `${JSON.stringify({ numero: anterior }, null, 2)}\n`);
  console.error(`\nNo se publicó; el número vuelve a ${anterior}.`);
  process.exit(1);
}

const env = entorno();
const proyecto = new URL(env.EXPO_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const carpeta = join(raiz, "dist/_expo/static/js/android");
const bundle = readdirSync(carpeta).find((f) => f.endsWith(".hbc") || f.endsWith(".js"));
if (!bundle || !readFileSync(join(carpeta, bundle)).includes(proyecto)) {
  console.error(
    `\n¡OJO! Lo publicado NO lleva la dirección de Supabase (${proyecto}). ` +
      "Revisa `eas env:list --environment preview` y borra esa actualización con `eas update:delete`. " +
      "No se avisó a nadie.",
  );
  process.exit(1);
}

const r = await fetch(`${env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/avisar_app_actualizada`, {
  method: "POST",
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ p_numero: numero, p_novedad: novedad }),
});
const texto = await r.text();
if (!r.ok) {
  console.error(`\nSe publicó la actualización ${numero}, pero no se pudo avisar: ${r.status} ${texto}`);
  process.exit(1);
}
console.log(`\nActualización ${numero} publicada. Avisadas: ${texto} personas.`);
console.log("Guarda en git src/shared/version/actualizacion.json (el número nuevo).");
