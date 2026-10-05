import ts from "typescript";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Texto suelto dentro de un `View`.
 *
 * React Native Web avisa en consola --«Unexpected text node. A text node
 * cannot be a child of a <View>»-- y en React Native nativo **revienta**: un
 * `View` no sabe pintar texto, solo un `Text` sabe.
 *
 * Lo reporto el cliente el 05/10/2026 viendolo en la consola del navegador.
 *
 * ## La forma que importa, y por que no se ve leyendo
 *
 * Casi nunca es `<View>Hola</View>`, que se ve a simple vista. Es esto:
 *
 *     {subtitulo && <Text>{subtitulo}</Text>}
 *
 * Si `subtitulo` es una **cadena vacia**, `"" && ...` vale `""`, y React pinta
 * esa cadena vacia como un nodo de texto. O sea que el aviso solo sale cuando
 * el dato esta vacio, que es justo el caso que nadie prueba. Con un booleano
 * --`{hayAlgo && ...}`-- no pasa: `false` no se pinta.
 *
 * Por eso esto usa el **compilador de TypeScript** y no un `grep`: hace falta
 * saber si lo de la izquierda del `&&` puede ser una cadena, y eso solo lo sabe
 * quien conoce los tipos. Una expresion regular da ciento cincuenta candidatos
 * y ninguno distinguible.
 *
 * ## Que marca
 *
 *   · un literal: `<View>Hola</View>`;
 *   · `{"Hola"}` o una plantilla, directamente dentro del contenedor;
 *   · `{x ? "si" : ""}`, que es la forma corta de lo mismo. La rama vacia
 *     cuenta: `""` se pinta como nodo de texto igual que cualquier cadena;
 *   · y `{cadena && <algo/>}`, donde el tipo de la izquierda admite `string` o
 *     `number`. Los numeros tambien: `{0 && ...}` pinta un `0`.
 *
 * La solucion es siempre la misma: comparar en vez de confiar en la verdad del
 * valor. `{subtitulo !== "" && ...}` o `{Boolean(subtitulo) && ...}`.
 */

const RAIZ = "src";
const TOPE = 0;

/**
 * Los contenedores que no pintan texto.
 *
 * Los de react-native, y los del proyecto que ponen `{children}` **dentro de un
 * `View`**: pasarles una cadena es lo mismo, solo que el aviso sale señalando
 * el `View` de dentro y cuesta mas encontrarlo. Comprobado leyendo cada uno.
 */
const CONTENEDORES = new Set([
  "View",
  "ScrollView",
  "Pressable",
  "SafeAreaView",
  "KeyboardAvoidingView",
  "TouchableOpacity",
  "Card",
  "Modal",
  "VeloModal",
  "ScreenLayout",
  "BottomSheet",
]);

function ficheros(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.tsx$/.test(nombre) && !/\.test\.tsx$/.test(nombre) ? [ruta] : [];
  });
}

const archivos = ficheros(RAIZ);

const programa = ts.createProgram(archivos, {
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  baseUrl: ".",
  paths: { "@/*": ["src/*"] },
});
const comprobador = programa.getTypeChecker();

/** El nombre del elemento: `View`, o `View` de `Animated.View`. */
function nombreDe(apertura) {
  const etiqueta = apertura.tagName;
  if (ts.isIdentifier(etiqueta)) return etiqueta.text;
  if (ts.isPropertyAccessExpression(etiqueta)) return etiqueta.name.text;
  return null;
}

const esContenedor = (nombre) => Boolean(nombre) && CONTENEDORES.has(nombre);

/** Si este tipo puede ser una cadena o un numero, o sea pintarse como texto. */
function puedePintarseComoTexto(tipo) {
  const partes = tipo.isUnion() ? tipo.types : [tipo];
  return partes.some((parte) => {
    const f = parte.flags;
    return Boolean(
      f & ts.TypeFlags.String ||
        f & ts.TypeFlags.StringLiteral ||
        f & ts.TypeFlags.Number ||
        f & ts.TypeFlags.NumberLiteral,
    );
  });
}

/**
 * Una expresion que solo puede dar texto, sin mirar tipos.
 *
 * La cadena **vacia** tambien cuenta, y es la que mas importa: es justo la que
 * produjo el aviso que vio el cliente. React pinta `""` como un nodo de texto
 * igual que cualquier otra cadena, y el mensaje sale sin nada que leer
 * --«Unexpected text node: .»-- asi que no se sabe ni que buscar. Comprobado
 * plantando `{""}` en una tarjeta de visita y mirando la consola.
 */
function siempreTexto(nodo) {
  if (!nodo) return false;
  if (ts.isStringLiteral(nodo)) return true;
  if (ts.isNoSubstitutionTemplateLiteral(nodo) || ts.isTemplateExpression(nodo)) {
    return true;
  }
  if (ts.isConditionalExpression(nodo)) {
    return siempreTexto(nodo.whenTrue) || siempreTexto(nodo.whenFalse);
  }
  return false;
}

const hallazgos = [];

function apunta(archivo, nodo, motivo) {
  const { line } = archivo.getLineAndCharacterOfPosition(nodo.getStart());
  const texto = nodo.getText().replace(/\s+/g, " ").slice(0, 64);
  hallazgos.push(`${relative(".", archivo.fileName)}:${line + 1}  ${motivo}: ${texto}`);
}

for (const archivo of programa.getSourceFiles()) {
  if (archivo.isDeclarationFile) continue;
  if (!archivo.fileName.includes("/src/") && !archivo.fileName.includes("\\src\\")) {
    continue;
  }

  const visitar = (nodo) => {
    if (
      (ts.isJsxElement(nodo) && esContenedor(nombreDe(nodo.openingElement))) ||
      false
    ) {
      for (const hijo of nodo.children) {
        if (ts.isJsxText(hijo) && hijo.text.trim() !== "") {
          apunta(archivo, hijo, "texto literal");
          continue;
        }
        if (!ts.isJsxExpression(hijo) || !hijo.expression) continue;

        const expresion = hijo.expression;
        if (siempreTexto(expresion)) {
          apunta(archivo, hijo, "una cadena");
          continue;
        }
        if (
          ts.isBinaryExpression(expresion) &&
          expresion.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        ) {
          const tipo = comprobador.getTypeAtLocation(expresion.left);
          if (puedePintarseComoTexto(tipo)) {
            apunta(
              archivo,
              expresion.left,
              `un \`&&\` sobre ${comprobador.typeToString(tipo)}`,
            );
          }
        }
      }
    }

    ts.forEachChild(nodo, visitar);
  };

  visitar(archivo);
}

for (const linea of hallazgos) console.log(linea);

console.log(
  `texto suelto dentro de un contenedor: ${hallazgos.length} (tope ${TOPE}).`,
);

if (hallazgos.length > TOPE) {
  console.error(
    "Un `View` no pinta texto: en el navegador avisa en consola y en el telefono revienta.\n" +
      "Si es un `&&` sobre una cadena, compara en vez de confiar en la verdad del valor:\n" +
      "  {texto !== \"\" && <Text>{texto}</Text>}",
  );
  process.exit(1);
}
