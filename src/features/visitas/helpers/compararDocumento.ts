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
 *     puntos, guiones o espacios («1.012.345.678», «1 012 345 678»);
 *   · el **nombre**: todas las palabras del nombre y los apellidos (de tres
 *     letras o más) aparecen en lo leído, sin mayúsculas ni tildes. Con una
 *     sola palabra no basta: «María» sale en muchos documentos.
 */
export type Coincidencia = "numero" | "nombre" | null;

export function compararDocumento(
  texto: string,
  ficha: { numero?: string | null; nombre?: string | null; apellidos?: string | null },
): Coincidencia {
  const numero = (ficha.numero ?? "").replace(/\D/g, "");
  if (numero.length >= 5) {
    // Cada tira de cifras, con sus separadores, se junta antes de comparar.
    const tiras = texto.match(/\d[\d.\-\s]*\d/g) ?? [];
    if (tiras.some((tira) => tira.replace(/\D/g, "").includes(numero))) {
      return "numero";
    }
  }

  const palabrasDe = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-zñ]+/)
      .filter((p) => p.length >= 3);
  const delNombre = [
    ...new Set(palabrasDe(`${ficha.nombre ?? ""} ${ficha.apellidos ?? ""}`)),
  ];
  if (delNombre.length >= 2) {
    const leidas = new Set(palabrasDe(texto));
    if (delNombre.every((p) => leidas.has(p))) return "nombre";
  }
  return null;
}
