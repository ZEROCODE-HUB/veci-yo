import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Un rótulo largo que empuja el interruptor fuera de la tarjeta.
 *
 * La forma: una fila (`flex-row`) con un texto y un `<Toggle>` al lado. Si el
 * texto no puede encogerse --ni `flex-1` ni `flexShrink`--, en un celular de
 * 320 o con la letra grande ocupa todo el ancho y el interruptor se sale por
 * la derecha o queda aplastado. Salió en la auditoría de responsividad
 * (25/10/2026) en el alias, los turnos del guardia, el cumplimiento legal,
 * los permisos y las encuestas; al enumerar aparecieron bastantes más.
 *
 * Marca cada hermano de un `<Toggle>` dentro de una fila que sea un `<Text>`,
 * o un `<View>` (que suele llevar el título y una explicación), sin
 * `flex-1`, `flex-shrink`, `shrink`, `flex: 1` ni `flexShrink`.
 */

const RAIZ = "src";

function ficheros(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.tsx$/.test(nombre) && !/\.test\.tsx$/.test(nombre) ? [ruta] : [];
  });
}

const etiqueta = (nodo, fuente) =>
  ts.isJsxElement(nodo)
    ? nodo.openingElement.tagName.getText(fuente)
    : ts.isJsxSelfClosingElement(nodo)
      ? nodo.tagName.getText(fuente)
      : null;

const atributos = (nodo) =>
  (ts.isJsxElement(nodo) ? nodo.openingElement : nodo).attributes.properties.filter(ts.isJsxAttribute);

const texto = (nodo, fuente, nombre) =>
  atributos(nodo)
    .filter((a) => a.name.getText(fuente) === nombre)
    .map((a) => a.getText(fuente))
    .join(" ");

const cede = (nodo, fuente) =>
  /\bflex-1\b|\bflex-shrink\b|\bshrink\b/.test(texto(nodo, fuente, "className")) ||
  /flexShrink|flex:\s*1\b/.test(texto(nodo, fuente, "style"));

const hallazgos = [];

for (const archivo of ficheros(RAIZ)) {
  const fuenteTexto = readFileSync(archivo, "utf8");
  if (!fuenteTexto.includes("<Toggle")) continue;
  const fuente = ts.createSourceFile(archivo, fuenteTexto, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);

  const visitar = (nodo) => {
    if (ts.isJsxElement(nodo)) {
      const hijos = nodo.children.filter((h) => ts.isJsxElement(h) || ts.isJsxSelfClosingElement(h));
      const conToggle = hijos.some((h) => etiqueta(h, fuente) === "Toggle");
      const esFila = /flex-row/.test(texto(nodo, fuente, "className")) || /flexDirection:\s*"row"/.test(texto(nodo, fuente, "style"));
      if (conToggle && esFila) {
        for (const h of hijos) {
          const tipo = etiqueta(h, fuente);
          if ((tipo === "Text" || tipo === "View") && !cede(h, fuente)) {
            const { line } = fuente.getLineAndCharacterOfPosition(h.getStart(fuente));
            hallazgos.push(`${relative(".", archivo)}:${line + 1} (${tipo})`);
          }
        }
      }
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
}

if (hallazgos.length > 0) {
  console.error(`Rótulos que empujan un interruptor (sin flex-1 ni flexShrink): ${hallazgos.length}`);
  for (const h of hallazgos) console.error(`  ${h}`);
  process.exit(1);
}
console.log("Interruptores: todos los rótulos de al lado ceden espacio.");
