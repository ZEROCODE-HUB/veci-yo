/**
 * La franja de check-in, dicha como la leería quien va a llegar.
 *
 * La administración la elige por vivienda, y hasta el 01/10/2026 se guardaba y
 * no la veía nadie: ni la base la imponía ni ninguna pantalla la enseñaba. El
 * campo venía del prototipo, donde los permisos de vivienda eran «UI y estado
 * local» --lo dice el propio KT-- así que allí tampoco hacía nada.
 *
 * Las tres opciones que el prototipo ofrecía eran «08:30 a 13:30», «14:00 a
 * 20:00» y **«24 horas»**, y esa tercera no es un rango: el inventario de
 * valores ya la marcó como pendiente de modelar. Se guarda como el día entero y
 * se dice con palabras, porque «de 00:00 a 23:59» no significa nada para quien
 * lo lee.
 *
 * Sin horario decidido devuelve `null`: la pantalla no promete una franja que
 * nadie puso.
 */
export function franjaDeCheckin(
  desde: string | null,
  hasta: string | null,
): string | null {
  if (!desde || !hasta) return null;

  // El dia entero, venga escrito como venga: el formulario guarda 23:59 y una
  // migracion futura podria guardar 24:00.
  const todoElDia =
    desde === "00:00" && (hasta === "23:59" || hasta === "24:00");
  if (todoElDia) return "A cualquier hora";

  // Una franja que empieza y acaba a la misma hora no es una franja.
  if (desde === hasta) return null;

  return `De ${desde} a ${hasta}`;
}
