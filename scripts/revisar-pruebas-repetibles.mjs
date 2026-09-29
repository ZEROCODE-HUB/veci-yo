/**
 * Archivos de prueba que pasan una vez y fallan la segunda.
 *
 * La suite completa da una foto engañosa: dentro de una corrida, un archivo que
 * no restaura lo que tocó puede quedar tapado por otro que lo vuelve a dejar
 * como estaba. Así estuvo `alojamiento.test.ts`, que dejaba un secreto en el
 * Vault sin referencia y cuya segunda corrida fallaba **siempre** --y con ella,
 * en producción, el anfitrión no podía volver a guardar la clave de su puerta--.
 *
 * Esto corre un archivo dos veces seguidas. Si la segunda falla, el archivo
 * depende de un estado que él mismo destruye.
 *
 * No va en `pretest`: cada archivo son segundos contra el Supabase real y la
 * suite entera tarda once minutos. Se corre a mano, o por tandas:
 *
 *   node scripts/revisar-pruebas-repetibles.mjs supabase/tests/alojamiento.test.ts
 *   node scripts/revisar-pruebas-repetibles.mjs            # todos, uno a uno
 */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const CONFIG = "vitest.rls.config.mts";

function todos() {
  const raiz = "supabase/tests";
  const sueltos = readdirSync(raiz)
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => join(raiz, f));
  const recorridos = readdirSync(join(raiz, "recorridos"))
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => join(raiz, "recorridos", f));
  return [...sueltos, ...recorridos];
}

function correr(archivo) {
  try {
    execFileSync(
      "npx",
      ["vitest", "run", "--config", CONFIG, archivo],
      { stdio: "pipe", encoding: "utf-8", shell: true },
    );
    return { ok: true };
  } catch (error) {
    const salida = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    return { ok: false, salida };
  }
}

const archivos = process.argv.slice(2).length ? process.argv.slice(2) : todos();
const rotos = [];

for (const archivo of archivos) {
  const primera = correr(archivo);
  if (!primera.ok) {
    console.log(`⊘ ${archivo} — ya falla la primera vez, no se puede juzgar`);
    continue;
  }
  const segunda = correr(archivo);
  if (segunda.ok) {
    console.log(`✓ ${archivo}`);
  } else {
    console.log(`✗ ${archivo} — pasa una vez y falla la segunda`);
    rotos.push({ archivo, salida: segunda.salida });
  }
}

if (rotos.length > 0) {
  console.error("\nArchivos que no se pueden correr dos veces seguidas:\n");
  for (const { archivo, salida } of rotos) {
    console.error(`  ${archivo}`);
    const pista = salida
      .split("\n")
      .find((l) => /AssertionError|Error:|expected/.test(l));
    if (pista) console.error(`    ${pista.trim().slice(0, 160)}`);
  }
  console.error(
    "\nUn archivo que no restaura lo que toca deja a la siguiente corrida\n" +
      "--y a la aplicacion-- en un estado que nadie eligio.\n",
  );
  process.exit(1);
}

console.log(`\n${archivos.length} archivos, todos repetibles.`);
