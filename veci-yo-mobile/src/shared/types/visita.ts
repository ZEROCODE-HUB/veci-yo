export interface VisitaItem {
  id: number;
  tipo: 'amigos' | 'temporal' | 'permanente' | 'huesped-temporal';
  nombre: string;
  ci: string;
  estado: string;
  instruccionDocumento?: 'verificar' | 'no-verificar';
  tipoNotificacion?: 'solo-notificar' | 'notificar-y-anunciar';
  invitados: Invitado[];
  tieneVehiculo: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  esEvento: boolean;
  nombreEvento?: string;
  vehiculos: Vehiculo[];
  qrUrl?: string;
  reserva?: string;
  torre?: string;
  depto?: string;
  personas?: number;
  horaIngreso?: string;
  horaSalida?: string;
  horaEstimadaLlegada?: string;
  horaEstimadaSalida?: string;
  registradoPor?: string;
  autorizadoPor?: string;
  autorizadoPorRol?: string;
  anotacionesIngreso?: string;
  anotacionesSalida?: string;
  fotosIngreso?: string[];
  fotosSalida?: string[];
  estacionamientosAsignados?: number;
  codigoAcceso?: string;
  telefonoResidente?: string;
  esMenor?: boolean;
  tieneTutela?: boolean;
  diasLaborales?: string;
  profesion?: string;
  profesionOtro?: string;
  paraAdministracion?: boolean;
  llego?: boolean;
  ciVerificado?: boolean;
  instruccionesCumplidas?: Record<string, boolean>;
}

export interface Invitado {
  nombre: string;
  llego: boolean;
  favorito?: boolean;
  aprobado?: string;
  documentos?: string[];
  esMenor?: boolean;
  tieneTutela?: boolean;
  terminosExcepcion?: boolean;
  terminosAprobadoPor?: string;
  timeline?: Record<string, boolean | string | null>;
  traSireReported?: boolean;
  ciVerificado?: boolean;
  horaIngreso?: string;
  horaSalida?: string;
  tipoDocumento?: string;
  documentoNumero?: string;
  fechaNacimiento?: string;
}

export interface Vehiculo {
  placa: string;
  tipo?: string;
}
