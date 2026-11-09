/**
 * A quién puede llamar un vecino: la portería y la administración
 * (09/11/2026, Correcciones fila 9).
 *
 * Hasta hoy la portería salía **solo si el edificio tenía una fila en la tabla
 * `porteria`**, y ningún edificio tenía ninguna: desde una vivienda solo se
 * podía llamar a la administración, y nunca se hizo una sola llamada a la
 * portería. Pero llamar a la portería no depende de esa tabla: la base hace
 * sonar la llamada en los guardias de turno con las llamadas habilitadas (y,
 * sin ninguno, en la administración). Así que la portería sale siempre.
 *
 * Si el edificio sí registró porterías con su teléfono, salen por su nombre
 * (para marcar a ese número); la llamada por la app va igual a la portería.
 */
export interface DestinoDeLlamada {
  clave: string;
  /** Lo que se lee en el selector: «Portería (guardia)», «Administración». */
  etiqueta: string;
  /** En formato internacional, o vacío si no hay ninguno registrado. */
  numero: string;
}

/** La clave de la portería cuando el edificio no registró ninguna. */
export const PORTERIA_DEL_EDIFICIO = "porteria:edificio";

export function destinosDeLlamada(
  porterias: Array<{ id: string; nombre: string; numero: string }>,
  administracion: { numero: string },
): DestinoDeLlamada[] {
  const deLaPorteria: DestinoDeLlamada[] = porterias.length
    ? porterias.map((p) => ({ clave: `porteria:${p.id}`, etiqueta: p.nombre, numero: p.numero }))
    : [{ clave: PORTERIA_DEL_EDIFICIO, etiqueta: "Portería (guardia)", numero: "" }];
  return [
    ...deLaPorteria,
    { clave: "administracion", etiqueta: "Administración", numero: administracion.numero },
  ];
}
