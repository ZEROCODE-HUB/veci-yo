/**
 * Compara el texto leído del documento físico con lo que el huésped registró
 * en su preregistro (23/10/2026, hueco 2).
 *
 * El cliente lo pidió así: «cuando el guardia escanee el documento, extrae el
 * texto y con eso lo compara. No lo hagas muy estricto ya que esto no será
 * perfecto, pero si hay coincidencia con el número o alguna coincidencia
 * clara, con eso ya se valida».
 *
 * Entonces vale cualquiera de las dos:
 *   · el **número** del documento aparece en lo leído, aunque venga con
 *     puntos, guiones, comas, barras o espacios («1.012.345.678»,
 *     «1 012 345 678»);
 *   · el **nombre**: al menos una palabra del nombre y una de los apellidos
 *     (de tres letras o más) aparecen en lo leído, sin mayúsculas ni tildes, y
 *     ninguna de las dos sola basta: «María» sale en muchos documentos.
 *
 * Y lo que lee el celular no es perfecto (Para Claude 225, 04/11/2026): una
 * cédula de 6 cifras escaneada cinco veces dio cinco veces «no coincide»,
 * porque bastaba una cifra mal leída. Por eso:
 *   · dentro de una tira que es casi toda cifras, las letras que el lector
 *     confunde con cifras se leen como esas cifras («O» → 0, «l» → 1, «S» → 5);
 *   · en un número de 6 cifras o más se perdona **una** cifra distinta;
 *   · un número con letras (pasaporte) se busca también letra por letra;
 *   · una palabra larga del nombre se perdona con una letra mal leída;
 *   · el nombre ya no exige todas sus palabras: un segundo nombre o apellido
 *     que el documento no trae no lo tumba.
 */
export type Coincidencia = "numero" | "nombre" | null;

/** Lo que el lector suele confundir con una cifra. */
const COMO_CIFRA: Record<string, string> = {
  O: "0", o: "0", Q: "0", D: "0",
  I: "1", l: "1", i: "1", "|": "1", "!": "1",
  Z: "2", z: "2",
  S: "5", s: "5",
  G: "6", b: "6",
  T: "7",
  B: "8",
  g: "9", q: "9",
};

/** Cuántas cifras tiene que tener el número para perdonarle una. */
const CIFRAS_PARA_PERDONAR = 6;

export function compararDocumento(
  texto: string,
  ficha: { numero?: string | null; nombre?: string | null; apellidos?: string | null },
): Coincidencia {
  if (coincideElNumero(texto, ficha.numero ?? "")) return "numero";
  if (coincideElNombre(texto, ficha.nombre ?? "", ficha.apellidos ?? "")) return "nombre";
  return null;
}

/**
 * Qué tan cerca estuvo, sin datos de la persona: para anotarlo en la base
 * cuando no coincide y saber la próxima vez por qué.
 */
export function diagnosticoDeLaComparacion(
  texto: string,
  ficha: { numero?: string | null; nombre?: string | null; apellidos?: string | null },
): string {
  const numero = soloCifras(ficha.numero ?? "");
  let mejor = 0;
  for (const tira of tirasDeCifras(texto)) {
    for (let i = 0; i + numero.length <= tira.length; i++) {
      let iguales = 0;
      for (let j = 0; j < numero.length; j++) if (tira[i + j] === numero[j]) iguales++;
      mejor = Math.max(mejor, iguales);
    }
  }
  const leidas = palabrasDe(texto);
  const delNombre = palabrasDe(ficha.nombre ?? "");
  const deApellidos = palabrasDe(ficha.apellidos ?? "");
  const cuantas = (lista: string[]) => lista.filter((p) => estaEntre(p, leidas)).length;
  /*
    09/11/2026, iPhone: tres escaneos con la foto ya grande dieron siempre el
    apellido y nunca el nombre ni el número. Para saber si el documento trae
    otro número (otro largo) o si el lector lo lee mal, se anota también cuántas
    cifras tiene cada número leído y a cuántas letras quedó la palabra más
    parecida al nombre. Ninguna de las dos cosas dice nada de la persona.
  */
  const largos = tirasDeCifras(texto)
    .map((t) => t.length)
    .filter((n) => n >= 3)
    .slice(0, 8);
  const cerca = delNombre.length
    ? Math.min(...delNombre.flatMap((p) => leidas.map((l) => distancia(p, l))), 99)
    : null;
  return (
    `número: ${mejor} de ${numero.length} cifras; ` +
    `nombre: ${cuantas(delNombre)} de ${delNombre.length}; ` +
    `apellidos: ${cuantas(deApellidos)} de ${deApellidos.length}` +
    (largos.length ? `; números leídos de ${largos.join(", ")} cifras` : "; ningún número leído") +
    (cerca !== null && cuantas(delNombre) < delNombre.length ? `; nombre a ${cerca} letras` : "")
  );
}

/** Cuántas letras hay que cambiar, quitar o poner para ir de una palabra a otra. */
function distancia(a: string, b: string): number {
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previa = fila;
  }
  return previa[b.length];
}

function coincideElNumero(texto: string, registrado: string): boolean {
  const numero = soloCifras(registrado);
  if (numero.length >= 5) {
    const perdon = numero.length >= CIFRAS_PARA_PERDONAR ? 1 : 0;
    if (tirasDeCifras(texto).some((tira) => contieneCasi(tira, numero, perdon))) return true;
  }
  // Un pasaporte o un carné con letras: se busca tal cual, sin separadores.
  const conLetras = registrado.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/[A-Z]/.test(conLetras) && conLetras.length >= 6) {
    return texto.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(conLetras);
  }
  return false;
}

function coincideElNombre(texto: string, nombre: string, apellidos: string): boolean {
  const leidas = palabrasDe(texto);
  const delNombre = palabrasDe(nombre);
  const deApellidos = palabrasDe(apellidos);
  // Sin apellidos registrados, dos palabras del nombre (como antes).
  if (deApellidos.length === 0) {
    return delNombre.length >= 2 && delNombre.filter((p) => estaEntre(p, leidas)).length >= 2;
  }
  return delNombre.some((p) => estaEntre(p, leidas)) && deApellidos.some((p) => estaEntre(p, leidas));
}

function soloCifras(t: string): string {
  return t.replace(/\D/g, "");
}

/**
 * Las tiras de cifras de lo leído, con sus separadores quitados. Antes, en
 * cada palabra que es casi toda cifras, lo que parece una cifra se lee como
 * tal: «1.0l2.345» es «1012345».
 */
function tirasDeCifras(texto: string): string[] {
  const corregido = texto
    .split(/(\s+)/)
    .map((palabra) => {
      const cifras = (palabra.match(/\d/g) ?? []).length;
      const signos = (palabra.match(/[A-Za-z0-9|!]/g) ?? []).length;
      if (cifras === 0 || cifras * 2 < signos) return palabra;
      return palabra.replace(/[A-Za-z|!]/g, (c) => COMO_CIFRA[c] ?? c);
    })
    .join("");
  return (corregido.match(/\d[\d.,\-/'\s]*\d/g) ?? []).map(soloCifras);
}

/** Si `numero` está dentro de `tira` con como mucho `perdon` cifras distintas. */
function contieneCasi(tira: string, numero: string, perdon: number): boolean {
  for (let i = 0; i + numero.length <= tira.length; i++) {
    let distintas = 0;
    for (let j = 0; j < numero.length && distintas <= perdon; j++) {
      if (tira[i + j] !== numero[j]) distintas++;
    }
    if (distintas <= perdon) return true;
  }
  return false;
}

/** Al revés: en una palabra que es casi toda letras, la cifra que parece letra. */
const COMO_LETRA: Record<string, string> = { "0": "o", "1": "i", "5": "s" };

function palabrasDe(t: string): string[] {
  return [
    ...new Set(
      t
        .split(/(\s+)/)
        .map((palabra) => {
          const cifras = (palabra.match(/\d/g) ?? []).length;
          const letras = (palabra.match(/\p{L}/gu) ?? []).length;
          if (cifras === 0 || cifras * 2 >= letras) return palabra;
          return palabra.replace(/[015]/g, (c) => COMO_LETRA[c] ?? c);
        })
        .join("")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((p) => p.length >= 3),
    ),
  ];
}

/** La palabra está entre las leídas; si es larga, con una letra mal leída vale. */
function estaEntre(palabra: string, leidas: string[]): boolean {
  return leidas.some(
    (leida) => leida === palabra || (palabra.length >= 5 && aUnaLetra(palabra, leida)),
  );
}

/** Si dos palabras se diferencian en como mucho una letra (cambiada, sobrante o faltante). */
function aUnaLetra(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let diferencias = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++diferencias > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return diferencias + (a.length - i) + (b.length - j) <= 1;
}
