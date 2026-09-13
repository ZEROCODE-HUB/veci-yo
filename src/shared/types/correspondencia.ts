export interface InformarInfo {
  descripcion: string;
  fotos: string[];
  fechaReporte: string;
  usuarioReporte: string;
}

export interface CorrespondenciaItem {
  id: number;
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
  informarInfo?: InformarInfo;
}
