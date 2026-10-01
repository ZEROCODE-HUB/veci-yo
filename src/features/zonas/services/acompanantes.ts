/**
 * Cuántos acompañantes lleva una reserva.
 *
 * La pantalla pregunta «Cantidad de personas que asistirán **junto al
 * titular**» y, con esa respuesta, pinta esa misma cantidad de campos bajo
 * «Nombres de los asistentes». Es decir: la lista son los acompañantes, y el
 * titular no está en ella.
 *
 * El cálculo restaba uno --`asistentes.filter(...).length - 1`-- como si el
 * primer nombre fuera el del titular. Así que elegir «2 personas» y escribir
 * dos nombres dejaba `acompanantes = 1` con dos filas en
 * `participante_reserva`: la lista y el número no decían lo mismo, y el número
 * es el que lee la portería.
 *
 * Se vio reservando la lavandería como Tomás con Marina y Julián. Ningún
 * recorrido lo cazaba porque todos pasan `acompanantes` y `participantes` por
 * separado, ya calculados: el `-1` vivía en el formulario.
 */
export function cuentaDeAcompanantes(
  asistentes: readonly { nombre?: string | null }[],
): number {
  // Un campo en blanco es un hueco del formulario, no una persona: quien elige
  // «3 personas» y solo escribe dos nombres lleva dos.
  return asistentes.filter((persona) => persona.nombre?.trim()).length;
}
