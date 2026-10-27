/**
 * El uuid del invitado que ocupa esa posición en la visita.
 *
 * El uuid reemplaza a su posición en el array: borrar o reordenar invitados ya
 * no puede mover los datos de otra persona.
 */
export const uuidInvitado = (
  visita: { invitados: { uuid?: string }[] },
  indice: number,
) => visita.invitados[indice]?.uuid ?? "";
