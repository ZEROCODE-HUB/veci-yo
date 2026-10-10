/**
 * Letras de 5×7 puntos, para escribir la marca de agua sin una fuente.
 *
 * Pintar texto sobre una imagen pide un archivo de fuente, y un archivo de
 * fuente es una dependencia con licencia que hay que empaquetar con la
 * función. Para una marca de agua —mayúsculas, números y cuatro signos— no
 * hace falta: cada letra es una rejilla de 5 por 7 que se pinta a puntos del
 * tamaño que se quiera.
 *
 * Es puro: recibe un texto y devuelve qué puntos van encendidos. No sabe nada
 * de imágenes, así que se puede probar sin ninguna.
 */

const ANCHO = 5;
const ALTO = 7;

const LETRAS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
};

/**
 * Lo que se puede escribir: mayúsculas sin acentos, números y `/ : - .`.
 *
 * «Portería» pasa a «PORTERIA» y lo que no tenga letra —una eñe pasa a N, un
 * emoji desaparece— se queda en un espacio: una marca de agua con un hueco se
 * lee; una función que revienta por un carácter raro en el nombre del
 * edificio no guarda la foto.
 */
export function aLetrasDeMarca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split("")
    .map((c) => (LETRAS[c] ? c : " "))
    .join("")
    .replace(/ +/g, " ")
    .trim();
}

export interface TextoEnPuntos {
  ancho: number;
  alto: number;
  /** `true` donde va tinta, por filas. */
  puntos: boolean[][];
}

/** El texto como rejilla de puntos, con una columna vacía entre letras. */
export function textoEnPuntos(texto: string): TextoEnPuntos {
  const letras = aLetrasDeMarca(texto).split("");
  const ancho = Math.max(0, letras.length * (ANCHO + 1) - 1);
  const puntos: boolean[][] = Array.from({ length: ALTO }, () =>
    Array<boolean>(ancho).fill(false),
  );
  letras.forEach((letra, i) => {
    const filas = LETRAS[letra];
    for (let y = 0; y < ALTO; y++) {
      for (let x = 0; x < ANCHO; x++) {
        if (filas[y][x] === "#") puntos[y][i * (ANCHO + 1) + x] = true;
      }
    }
  });
  return { ancho, alto: ALTO, puntos };
}
