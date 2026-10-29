import { useMemo } from "react";
import { useLista, type OpcionDeLista } from "./useLista";

/** Las tres casillas que existen: una columna `tiene_*` de la base por cada una. */
const CLAVES = ["antirruido", "noFumar", "sensor"] as const;
export type ClaveDeEquipamiento = (typeof CLAVES)[number];

export interface ItemDeEquipamiento {
  clave: ClaveDeEquipamiento;
  etiqueta: string;
  icono: string;
}

/**
 * El equipamiento obligatorio de una renta corta, como lo nombra la lista
 * `equipamiento_obligatorio` (28/10/2026).
 *
 * Del administrador salen el nombre, el icono, el orden y si se muestra.
 * **Qué** casillas hay no: cada una es una columna fija de
 * `suscripcion_renta_corta` --`tiene_antirruido`, `tiene_no_fumar`,
 * `tiene_sensor`--, y `extra.clave_en_codigo` dice a cuál corresponde. Una
 * opción con una clave que no es de las tres se ignora: no tendría dónde
 * guardarse.
 *
 * Los nombres vivían escritos en tres pantallas, y no coincidían: «Sensor de
 * incendio/gas/CO2» en una y «Sensor de humo» en otra.
 */
export function equipamientoDeLaLista(opciones: OpcionDeLista[]): ItemDeEquipamiento[] {
  return opciones.flatMap((o) => {
    const clave = o.extra.clave_en_codigo;
    if (!CLAVES.includes(clave as ClaveDeEquipamiento)) return [];
    const icono = typeof o.extra.icono === "string" ? o.extra.icono : "";
    return [{ clave: clave as ClaveDeEquipamiento, etiqueta: o.etiqueta, icono }];
  });
}

export function useEquipamientoObligatorio(): ItemDeEquipamiento[] {
  const { opciones } = useLista("equipamiento_obligatorio");
  return useMemo(() => equipamientoDeLaLista(opciones), [opciones]);
}
