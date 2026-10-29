export {
  adjuntarAReclamo,
  cambiarEstadoReclamo,
  guardarAlias,
  obtenerAlias,
  crearReclamo,
  obtenerContactoSoporte,
  obtenerPreguntasFrecuentes,
  guardarPreguntaFrecuente,
  eliminarPreguntaFrecuente,
  obtenerAdjuntos,
  obtenerReclamos,
  quitarAdjunto,
  BUCKET_PQRS,
  DESTINATARIOS,
  ESTADOS,
  MEDIOS_CONTACTO,
} from "./pqrs.repo";
export type {
  AdjuntoReclamo,
  AliasPerfil,
  AmbitoReclamos,
  ContactoSoporte,
  NuevoReclamo,
  PreguntaFrecuente,
  Reclamo,
} from "./pqrs.repo";
export { activarSos, cerrarSos } from "./sos.repo";
export type { AlarmaActivada, MotivoCierre } from "./sos.repo";
