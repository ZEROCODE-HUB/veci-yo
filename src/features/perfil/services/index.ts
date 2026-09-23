export {
  adjuntarAReclamo,
  cambiarEstadoReclamo,
  guardarAlias,
  obtenerAlias,
  crearReclamo,
  obtenerContactoSoporte,
  obtenerPreguntasFrecuentes,
  obtenerAdjuntos,
  obtenerReclamos,
  quitarAdjunto,
  BUCKET_PQRS,
  AREAS,
  DESTINATARIOS,
  ESTADOS,
  MEDIOS_CONTACTO,
  TIPOS,
  TIPOS_POR_AREA,
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
