#!/usr/bin/env node
/**
 * Busca funciones de datos escritas y nunca conectadas.
 *
 * Es el defecto que más veces ha aparecido en este proyecto: alguien escribe
 * la función del repositorio, la prueba de RLS la cubre, y **ningún botón la
 * llama**. Ha pasado con `reportarTraSire`, con las tres del precheckin, y con
 * `subirFotoVisita`/`urlFotoVisita`, que existían desde el primer día mientras
 * la pantalla guardaba en su lugar una URI `blob:` que moría al recargar.
 *
 * Una prueba de recorrido no lo detecta: comprueba el repositorio, que
 * funciona. El defecto vive por encima.
 *
 * Qué cuenta como conectada: que alguien fuera de su propio archivo la
 * nombre. Los barriles (`export * from "./x.repo"`) no cuentan, porque
 * reexportar no es usar.
 *
 * Esto no falla la construcción: informa. Una función puede estar suelta a
 * propósito --recién escrita, o parte de un flujo a medias-- y decidirlo es de
 * quien lee, no del script.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FUENTE = join(RAIZ, "src");

function* archivos(dir) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules") continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) yield* archivos(ruta);
    else if (/\.tsx?$/.test(ruta)) yield ruta;
  }
}

const todos = [...archivos(FUENTE)];
const contenido = new Map(todos.map((r) => [r, readFileSync(r, "utf-8")]));

/** Un barril solo reexporta; que aparezca ahí no significa que se use. */
const esBarril = (ruta, texto) =>
  ruta.endsWith(`${sep}index.ts`) && /^\s*export \*/m.test(texto);

const sueltas = [];
for (const [ruta, texto] of contenido) {
  if (!/\.(repo|service)\.ts$/.test(ruta)) continue;

  for (const m of texto.matchAll(/export (?:async )?function (\w+)/g)) {
    const nombre = m[1];
    const patron = new RegExp(`\\b${nombre}\\b`);
    const usadaFuera = [...contenido].some(
      ([otra, suTexto]) =>
        otra !== ruta && !esBarril(otra, suTexto) && patron.test(suTexto),
    );
    // Tambien vale que la llame una vecina de su propio archivo: eso es lo que
    // pasa con `subirFotoVisita`, que hoy usa `adjuntarFotosVisita`. Se cuenta
    // por apariciones: una es la declaracion, dos o mas es que alguien la usa.
    const vecesEnSuArchivo = (
      texto.match(new RegExp(`\\b${nombre}\\b`, "g")) || []
    ).length;
    if (!usadaFuera && vecesEnSuArchivo < 2) {
      sueltas.push(`${relative(RAIZ, ruta).split(sep).join("/")} :: ${nombre}`);
    }
  }
}

if (sueltas.length === 0) {
  console.log("Ninguna función de datos está sin conectar.");
} else {
  console.log(
    `${sueltas.length} función(es) de datos escritas y nunca llamadas desde la aplicación:\n`,
  );
  for (const s of sueltas) console.log("  " + s);
  console.log(
    "\nCada una es una pantalla que promete algo que no hace, o trabajo muerto.\n" +
      "Conectarla o quitarla; dejarla es lo que no vale.",
  );
}
