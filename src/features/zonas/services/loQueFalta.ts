/**
 * Qué le falta a la reserva para poder guardarse.
 *
 * El botón «Aceptar» se apagaba con `!hora || !acceptTerms` y no decía por
 * qué. Un botón apagado sin motivo es el mismo problema que un botón que no
 * hace nada: no hay forma de distinguirlo de algo roto.
 *
 * Y lo peor: el **N° de lavandería** no estaba en esa cuenta ni en el esquema
 * --era `z.string().optional()`--, así que se podía reservar sin elegirlo. El
 * fallo era además invisible desde que la base asigna el primer puesto libre
 * a quien llega sin número: se reservaba, salía bien, y nadie se enteraba de
 * que la elección se había tirado.
 *
 * Vive fuera del componente para poder comprobarlo sin montar el formulario.
 */
export interface EstadoDelFormulario {
  hora: string;
  /** La zona tiene más de un puesto, así que hay que elegir cuál. */
  pideNumero: boolean;
  numero: string;
  aceptaReglamento: boolean;
}

export function loQueFalta(estado: EstadoDelFormulario): string[] {
  const falta: string[] = [];
  if (!estado.hora) falta.push("elegir una hora");
  if (estado.pideNumero && !estado.numero) falta.push("elegir el número");
  if (!estado.aceptaReglamento) falta.push("aceptar el reglamento");
  return falta;
}

/** Lo que se pinta debajo del botón: «Falta elegir el número y aceptar el reglamento». */
export function frasede(falta: readonly string[]): string {
  if (falta.length === 0) return "";
  if (falta.length === 1) return `Falta ${falta[0]}.`;
  const ultimo = falta[falta.length - 1];
  return `Falta ${falta.slice(0, -1).join(", ")} y ${ultimo}.`;
}
