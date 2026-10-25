import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Listas con alto máximo que no se deslizan en Android.
 *
 * Un `ScrollView` con `maxHeight` (o `max-h-…`) es una lista acotada **dentro
 * de otra cosa que ya se desliza**: la pantalla, una ventana emergente
 * (`Modal` lleva su propio `ScrollView`). En Android, el de dentro no se
 * mueve si no lleva `nestedScrollEnabled`: el dedo lo arrastra el de fuera, y
 * lo que queda por debajo de la lista no se puede ver.
 *
 * Salió en la auditoría de responsividad (25/10/2026) en el contrato activo y
 * en la lista de Gratitud; al buscar aparecieron dos más. En iOS y en la web
 * se ve bien, por eso no se nota probando en la computadora.
 *
 * Marca cada `<ScrollView>` o `<FlatList>` cuyo `style` o `className` acota
 * el alto y que no lleva `nestedScrollEnabled`.
 */

const RAIZ = "src";
const LISTAS = new Set(["ScrollView", "FlatList"]);

function ficheros(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.tsx$/.test(nombre) && !/\.test\.tsx$/.test(nombre) ? [ruta] : [];
  });
}

const hallazgos = [];

for (const archivo of ficheros(RAIZ)) {
  const texto = readFileSync(archivo, "utf8");
  if (!/ScrollView|FlatList/.test(texto)) continue;
  const fuente = ts.createSourceFile(archivo, texto, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);

  const visitar = (nodo) => {
    if (
      (ts.isJsxOpeningElement(nodo) || ts.isJsxSelfClosingElement(nodo)) &&
      LISTAS.has(nodo.tagName.getText(fuente))
    ) {
      const atributos = nodo.attributes.properties.filter(ts.isJsxAttribute);
      const nombre = (a) => a.name.getText(fuente);
      const acotada = atributos.some(
        (a) =>
          (nombre(a) === "style" || nombre(a) === "className") &&
          /maxHeight|max-h-/.test(a.getText(fuente)),
      );
      const anidada = atributos.some((a) => nombre(a) === "nestedScrollEnabled");
      if (acotada && !anidada) {
        const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente));
        hallazgos.push(`${relative(".", archivo)}:${line + 1}`);
      }
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
}

if (hallazgos.length > 0) {
  console.error(
    `Listas con alto máximo sin nestedScrollEnabled (en Android no se deslizan): ${hallazgos.length}`,
  );
  for (const h of hallazgos) console.error(`  ${h}`);
  process.exit(1);
}
console.log("Scrolls anidados: todos con nestedScrollEnabled.");
