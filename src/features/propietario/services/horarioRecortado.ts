/**
 * Si el horario de entrada que pone el anfitrión queda recortado por el del
 * edificio, la frase que se le dice (hueco 51, 27/10/2026). Nulo si no.
 *
 * Es la misma cuenta que hace la base en `horario_de_entrada`: vale el del
 * anfitrión dentro del límite del edificio, y si cae entero fuera, el del
 * edificio. Antes se recortaba sin decirle nada.
 *
 * Horas en `HH:mm`; vacío es «sin límite».
 */
export function horarioRecortado(
  anfitrion: { desde: string; hasta: string; todoElDia: boolean },
  edificio: { desde: string; hasta: string },
): string | null {
  const ed = edificio.desde || "";
  const eh = edificio.hasta || "";
  if (!ed && !eh) return null;

  const ad = anfitrion.todoElDia ? "" : anfitrion.desde;
  const ah = anfitrion.todoElDia ? "" : anfitrion.hasta;

  let d = !ad ? ed : !ed ? ad : ad > ed ? ad : ed;
  let h = !ah ? eh : !eh ? ah : ah < eh ? ah : eh;
  if (d && h && d >= h) {
    d = ed;
    h = eh;
  }

  if (d === ad && h === ah) return null;

  const franja = (desde: string, hasta: string) =>
    desde && hasta ? `de ${desde} a ${hasta}` : desde ? `desde las ${desde}` : `hasta las ${hasta}`;
  return `El edificio solo deja entrar ${franja(ed, eh)}, así que tus huéspedes podrán llegar ${franja(d, h)}.`;
}
