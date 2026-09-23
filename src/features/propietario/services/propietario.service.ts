/**
 * Lo que queda del servicio simulado del propietario.
 *
 * Tenía `obtenerResidentes`, `crearResidente`, `actualizarResidente` y
 * `eliminarResidente`, y las cuatro eran una imitación de red: un
 * `setTimeout` de 180 ms sobre un store de Zustand. Quién vive en una vivienda
 * sale ahora de `membresia_unidad`, por `residentes.repo.ts`, y darle de alta
 * es una invitación.
 *
 * Solo sobrevive el alta de un servicio contratado —luz, agua, internet— que
 * **tampoco tiene tabla**: el KT lista "agregar servicio" entre lo que hace el
 * Propietario, pero no hay dónde guardarlo ni quién lo consulte. Es el mismo
 * hueco que tenía el contrato de arrendamiento antes de esta tanda, y se
 * resuelve igual el día que se decida; mientras tanto no se finge que guarda.
 */
const simularRespuesta = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const simularAgregarServicio = <T>(datos: T) => simularRespuesta(datos);
