/** Lo que hace falta de una vivienda para nombrarla. */
export interface ViviendaConNombre {
  /** El condominio: «Las Barranqueras 246». Es lo que trae `sesion.ts`. */
  direccion: string;
  /** La vivienda compuesta: «Torre 1 · 102». */
  alias?: string;
  /** El código de la unidad a secas: «102». */
  codigo?: string;
}

/**
 * Cómo se nombra una vivienda en la barra de arriba y en su desplegable.
 *
 * Decía dos cosas distintas en el mismo sitio: a un residente, **la vivienda**
 * («Torre 1 · 102»); a la portería y la administración, **el edificio**
 * («Admin · Las Barranqueras 246»). Y ese texto es justo el que se pulsa para
 * cambiar de sitio, así que nombrar solo la vivienda deja sin decir a cuál de
 * los dos edificios pertenece --que es lo único que distingue las filas del
 * desplegable para quien tiene casa en dos--.
 *
 * Decidido con el cliente el 01/10/2026 (REVISAR-A-OJO 81): las dos cosas.
 *
 * El detalle completo --con la torre-- se queda en la tarjeta de «Mis
 * viviendas», que es donde hay sitio. Aquí va el código a secas porque el
 * espacio es una línea que no se parte.
 *
 * Vive aquí, y no compuesto en cada pantalla, por lo que ya pasó con las horas
 * de los turnos: dos sitios que arman el mismo texto lo arman distinto --uno
 * escribía «08:00 - 16:00» y otro «08:00 a 16:00»-- y nada lo dice.
 */
export function nombreDeVivienda(vivienda: ViviendaConNombre): string {
  const { direccion, alias, codigo } = vivienda;

  // Sin edificio no hay nada que anteponer: queda lo que haya.
  if (!direccion) return alias || codigo || "";

  // Los datos de demostración y el modo incógnito no traen código de unidad.
  if (!codigo) return direccion;

  return `${direccion} · ${codigo}`;
}
