export interface Guardia {
  /** Identificador real: es la membresia de condominio con rol guardia. */
  uuid?: string;
  porteriaId?: string;
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
  uuid?: string;
  dia: string;
  hora: string;
}

export interface TurnoOverride {
  uuid?: string;
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

/**
 * Lo que una vivienda admite en cada tipo de estancia.
 *
 * Los cuatro permisos eran `string` con "Sí"/"No", y los días una frase como
 * "2 dias" de la que la pantalla sacaba el número con una expresión regular.
 * Convivían tres grafías del mismo valor —"Sí", "Si" y "días" con tilde— y el
 * código estaba parcheado para leer todas.
 *
 * El KT ya lo marcaba (6.2: *"debería ser boolean, sigue string"*) y la regla
 * 5 de `AGENTS.md` lo prohíbe: booleano es `boolean`, nunca "Sí"/"No".
 */
export interface EstanciaConfig {
  permiteVisitas: boolean;
  permiteHuespedNinos: boolean;
  permiteMascotas: boolean;
  permiteCocherasVisit: boolean;
  /** Noches. En la base es un `integer`. */
  estanciaMinima: number;
  estanciaMaxima?: number | null;
  /** Rango "HH:mm a HH:mm", o "24 horas". La base lo parte en dos `time`. */
  horarioCheckin: string;
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
  /** Membresia si ya acepto, o invitacion si todavia no. */
  uuid?: string;
  /** Distingue a quien ya es miembro de quien solo fue invitado. */
  esInvitacion?: boolean;
  id: number;
  nombre: string;
  correo: string;
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
