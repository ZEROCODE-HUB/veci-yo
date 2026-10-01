/**
 * Las tres respuestas a «¿permites que tus huéspedes registren visitas?».
 *
 * Estaban escritas dos veces: la pantalla pintaba tres opciones con sus
 * valores y el repositorio tenía dos diccionarios para traducirlos al enum de
 * la base y de vuelta. La tercera no coincidía --`aprobar-por-huesped` en la
 * pantalla, `aprobar-cada-uno` en el repositorio-- y eso rompía las dos
 * direcciones a la vez:
 *
 * - al leer, `aprobar_cada_uno` llegaba traducido a un valor que ninguna de
 *   las tres opciones tenía, así que no se marcaba ninguna;
 * - al guardar, el valor de la pantalla no estaba en el diccionario, se
 *   mandaba `null`, y la función de la base hace `coalesce(null, lo de
 *   antes)`. No cambiaba nada y salía «Configuración guardada» en verde.
 *
 * Las otras dos funcionaban, que es justo lo que hacía difícil de ver el
 * fallo. Por eso el vocabulario vive aquí una sola vez y la pantalla pinta lo
 * que esta lista diga: una opción nueva no se puede añadir a medias.
 */
export interface OpcionDeVisitas {
  /** Lo que maneja el formulario. */
  valor: string;
  /** Cómo lo llama el enum `visitas_de_huesped` de la base. */
  enLaBase: string;
  etiqueta: string;
}

export const VISITAS_DE_HUESPED: readonly OpcionDeVisitas[] = [
  {
    valor: "permitir-todos",
    enLaBase: "permitir_todos",
    etiqueta: "Permitir automáticamente a todos",
  },
  {
    valor: "prohibir-todos",
    enLaBase: "prohibir_todos",
    etiqueta: "Prohibir automáticamente a todos",
  },
  {
    valor: "aprobar-cada-uno",
    enLaBase: "aprobar_cada_uno",
    etiqueta: "Aprobar huésped por huésped",
  },
];

/** La opción con la que nace el formulario si la vivienda no tiene nada dicho. */
export const VISITAS_POR_DEFECTO = VISITAS_DE_HUESPED[0].valor;

/**
 * Del formulario a la base. `null` cuando el valor no es ninguno de los tres:
 * la función de la base entiende `null` como «no toques esta columna», que es
 * lo correcto ante algo que no se sabe traducir.
 */
export function haciaLaBase(valor: string): string | null {
  return VISITAS_DE_HUESPED.find((o) => o.valor === valor)?.enLaBase ?? null;
}

/** De la base al formulario. */
export function haciaElFormulario(enLaBase: string | null | undefined): string {
  return (
    VISITAS_DE_HUESPED.find((o) => o.enLaBase === enLaBase)?.valor ??
    VISITAS_POR_DEFECTO
  );
}
