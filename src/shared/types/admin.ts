export interface Guardia {
  id: number;
  nombre: string;
  correo: string;
  cedula: string;
  diasCalendario: string;
  garita: string;
  turnos: Turno[];
  permisoChat?: boolean;
  permisoLlamadas?: boolean;
  rotacionActiva?: boolean;
  tipoRotacion?: string;
  overrides?: TurnoOverride[];
}

export interface Turno {
  dia: string;
  hora: string;
}

export interface TurnoOverride {
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface PermisoVivienda {
  entregaDirecta: boolean;
  huespedesTemporales: boolean;
  diferenciaEstancia?: boolean;
  estanciaCorta: EstanciaConfig;
  estanciaLarga: EstanciaConfig;
}

export interface EstanciaConfig {
  permiteVisitas: string;
  estanciaMinima: string;
  permiteHuespedNinos: string;
  permiteMascotas: string;
  permiteCocherasVisit: string;
  horarioCheckin: string;
  estanciaMaxima?: string;
}

export interface Residente {
  id: number;
  nombre: string;
  rol: string;
  ci: string;
  fecha: string;
  correo: string;
  tipo: string;
  codigoArea: string;
  telefono: string;
  contactoNombre: string;
  contactoCodigo: string;
  contactoTelefono: string;
  fechaInicio: string;
  duracion: string;
  montoAlquiler: string;
  monitoreoPago: boolean;
  servicios: Record<string, unknown>;
}

export interface Coadministrador {
  id: number;
  nombre: string;
  correo?: string;
  email?: string;
  unidadId: number;
  estado: string;
  fechaInvitacion: string;
  apellido?: string;
  celular?: string;
  permisos?: Record<string, boolean>;
}

export interface CuadroHonorDepto {
  id: number;
  departamento: string;
  responsable: string;
  estado: string;
  contador: string;
  medallas: boolean[];
}

export interface Insignia {
  key: string;
  icono: string;
  label: string;
  cantidad: number;
}

export interface Logro {
  key: string;
  label: string;
  emoji: string;
  conseguido: boolean;
}
