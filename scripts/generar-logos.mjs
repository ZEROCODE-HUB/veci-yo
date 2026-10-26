/**
 * Mete los logos de Airbnb y Booking dentro del proyecto.
 *
 *     node scripts/generar-logos.mjs
 *
 * Decisión del cliente (hueco 5, 21/10/2026): «Usar logos oficiales». Hasta
 * entonces el distintivo de una reserva era el nombre escrito en el color de
 * la marca.
 *
 * Los originales están en `assets/logos/` y salen de Wikimedia Commons:
 *   · `airbnb.svg`  — «Airbnb Logo Bélo.svg»
 *   · `booking.svg` — «Booking.com logo.svg»
 * Son marcas registradas de sus dueños; se usan solo para decir de qué
 * plataforma viene una reserva, que es el uso nominativo que las dos marcas
 * admiten.
 *
 * Mismo motivo que las banderas (`generar-banderas.mjs`): Metro no importa un
 * `.svg` sin un transformador, y `react-native-svg` ya sabe pintar un SVG que
 * llega como texto. Aquí se le quita al archivo lo que no dibuja --la cabecera
 * XML, los comentarios, los metadatos y los atributos de Inkscape-- y se mete
 * en un módulo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const ORIGEN = join(RAIZ, "assets", "logos");
const DESTINO = join(RAIZ, "src", "shared", "constants", "logos.generado.ts");

const LOGOS = ["airbnb", "booking"];

function limpiar(svg) {
  let s = svg;
  s = s.replace(/<\?xml[\s\S]*?\?>/g, "");
  s = s.replace(/<!DOCTYPE[\s\S]*?>/g, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<metadata[\s\S]*?<\/metadata>/g, "");
  s = s.replace(/<sodipodi:namedview[\s\S]*?\/>/g, "");
  // Atributos de editores y espacios de nombres que no dibujan.
  s = s.replace(/\s(?:inkscape|sodipodi):[\w-]+="[^"]*"/g, "");
  s = s.replace(/\sxmlns:(?:dc|cc|rdf|svg|sodipodi|inkscape|xlink)="[^"]*"/g, "");
  s = s.replace(/\s(?:enable-background|xml:space|version)="[^"]*"/g, "");
  s = s.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  return s;
}

function medidas(svg) {
  const vb = /viewBox="([^"]+)"/.exec(svg);
  if (!vb) throw new Error("Un logo sin viewBox no se puede escalar");
  const [, , ancho, alto] = vb[1].trim().split(/[\s,]+/).map(Number);
  return { ancho, alto };
}

const entradas = [];
for (const nombre of LOGOS) {
  const svg = limpiar(readFileSync(join(ORIGEN, `${nombre}.svg`), "utf-8"));
  if (!svg.startsWith("<svg") || !svg.includes("<path")) {
    throw new Error(`El logo ${nombre} no quedó como un dibujo`);
  }
  const { ancho, alto } = medidas(svg);
  entradas.push(
    `  ${nombre}: { proporcion: ${(ancho / alto).toFixed(4)}, svg: ${JSON.stringify(svg)} },`,
  );
}

writeFileSync(
  DESTINO,
  [
    "// Generado por scripts/generar-logos.mjs. No se edita a mano.",
    "// Logos de Airbnb y Booking (hueco 5): marcas de sus dueños, uso nominativo.",
    "export const LOGOS: Record<\"airbnb\" | \"booking\", { proporcion: number; svg: string }> = {",
    ...entradas,
    "};",
    "",
  ].join("\n"),
  "utf-8",
);
console.log(`${DESTINO}: ${entradas.length} logos`);
