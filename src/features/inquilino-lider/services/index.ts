export {
  agregarUbicacionRequest,
  actualizarUbicacionRequest,
  eliminarUbicacionRequest,
  obtenerUbicacionesRequest,
} from "./inquilinoLider.service";

export {
  obtenerCuadroHonor,
  obtenerCatalogoInsignias,
  obtenerResumenCuotas,
  otorgarReconocimiento,
} from "./cuadroHonor.repo";
export type {
  InsigniaCatalogo,
  PeriodoCuota,
  UnidadCuadroHonor,
} from "./cuadroHonor.repo";
export { contarRegalosPorDar } from "./cuadroHonor.repo";
