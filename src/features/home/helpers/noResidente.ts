import type { RolActivo } from "@/shared/types";

/**
 * Si quien mira es dueño de la vivienda pero **no vive en ella**.
 *
 * Decide qué módulos se le ofrecen: la correspondencia, las visitas y las zonas
 * comunes son de quien vive allí, no de quien es dueño desde otra ciudad.
 *
 * Se calculaba `rolActivo === "propietario" && !esResidente`, y ahí estaba el
 * fallo: a quien de verdad no reside, la sesión le da el rol
 * **`propietario-no-residente`**. Así que la primera mitad era falsa justo para
 * la persona a la que la regla apuntaba, y la restricción no se aplicaba a
 * nadie. Recorriendo la aplicación con Guillermo puesto como no residente, el
 * menú le salía entero.
 *
 * Es de las cosas decorativas más escondidas del proyecto, porque el código que
 * la implementa **existe y es correcto**: lo que no llegaba era la condición.
 *
 * Mira las dos cosas, y hacen falta las dos:
 *
 *  · el **rol**, para quien solo tiene viviendas donde no vive;
 *  · la **vivienda activa**, para quien tiene dos y está mirando aquella donde
 *    no vive --entonces entra como `propietario` a secas, porque la otra sí es
 *    suya de vivir--.
 */
export function esNoResidente(
  rolActivo: RolActivo,
  esResidenteDeLaUnidad: boolean,
): boolean {
  if (rolActivo === "propietario-no-residente") return true;
  return rolActivo === "propietario" && !esResidenteDeLaUnidad;
}
