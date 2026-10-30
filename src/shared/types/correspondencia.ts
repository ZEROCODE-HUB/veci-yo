export interface InformarInfo {
  descripcion: string;
  /** Rutas dentro del bucket privado, no direcciones que se puedan abrir. */
  fotos: string[];
  fechaReporte: string;
  usuarioReporte: string;
}

export interface CorrespondenciaItem {
  /** Identificador real en la base. Es el que usan las mutaciones. */
  uuid?: string;
  /** Derivado del uuid, solo para listas heredadas que comparan numeros. */
  id: number;
  unidadId?: string;
  empresa: string;
  unidad: string;
  nombre: string;
  ci: string;
  estado: 'No Recibido' | 'En Portería' | 'Entregado';
  fecha: string;
  categoria: string;
  logistica: string;
  descripcion: string;
  entregaEnPuerta: boolean;
  torre: string;
  piso: string;
  estadoEncomienda: string;
  fechaRegistro?: string;
  horaRegistro?: string;
  registradoPor?: string;
  fechaRecibido?: string;
  horaRecibido?: string;
  recibidoPor?: string;
  fechaEntregado?: string;
  horaEntregado?: string;
  entregadoA?: string;
  /** Aviso al destinatario por otro medio, sin entregarlo (30/10/2026). */
  fechaNotificado?: string;
  horaNotificado?: string;
  notificadoPor?: string;
  /** Entrega en puerta: quien entró al edificio y la ruta de la foto de su documento. */
  ingresoNombre?: string;
  ingresoDocumentoFoto?: string;
  informarInfo?: InformarInfo;
  /** Rutas dentro del bucket privado, no direcciones que se puedan abrir. */
  fotos?: string[];
  instrucciones?: string;
}
