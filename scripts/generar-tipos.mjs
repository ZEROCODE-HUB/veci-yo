import { readFileSync, writeFileSync } from "node:fs";

/**
 * Regenera `src/shared/types/database.types.ts` desde el Supabase real.
 *
 * La regla 1 dice que la fuente de verdad es el schema y que los tipos del
 * cliente se derivan de él. No había forma de derivarlos: el archivo se
 * generó una vez y se quedó, así que cada función nueva daba un error de
 * typecheck que invitaba a escribir el tipo a mano en paralelo.
 *
 *   npm run tipos
 */
const entorno = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const [clave, ...resto] = l.split("=");
      return [clave, resto.join("=")];
    }),
);

const respuesta = await fetch(
  `https://api.supabase.com/v1/projects/${entorno.SUPABASE_PROJECT_REF}/types/typescript`,
  { headers: { Authorization: `Bearer ${entorno.SUPABASE_ACCESS_TOKEN}` } },
);

if (!respuesta.ok) {
  console.error(`${respuesta.status}: ${await respuesta.text()}`);
  process.exit(1);
}

const { types } = await respuesta.json();
writeFileSync("src/shared/types/database.types.ts", types, "utf-8");
console.log("src/shared/types/database.types.ts regenerado");
