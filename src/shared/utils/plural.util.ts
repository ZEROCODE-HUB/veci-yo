/**
 * «1 vivienda» y «4 viviendas».
 *
 * Salió recorriendo el panel de la plataforma: el edificio sembrado decía
 * «1 viviendas · 1 personas». No rompe nada y se lee mal en la primera pantalla
 * que ve quien opera el producto.
 *
 * Deliberadamente tonto: añade una `s`, y para las palabras que no se pluralizan
 * así se le pasa el plural. No hay una regla general del castellano que quepa en
 * una función, y fingir que sí la hay es peor que pedir las dos formas.
 */
export function plural(
  cantidad: number,
  singular: string,
  enPlural?: string,
): string {
  const palabra =
    cantidad === 1 ? singular : (enPlural ?? `${singular}s`);
  return `${cantidad} ${palabra}`;
}
