export interface ZonaComun {
  id: string;
  nombre: string;
  emoji: string;
  disponibles: number;
  total: number;
  usaSlots: boolean;
  duracionMaxima: number;
  restringidaHuesped: boolean;
  reglamento: string;
  descripcion?: string;
  horariosDisponibles?: Horario[];
  capacidadMaxima?: number;
  requiereAprobacion?: boolean;
}

export interface Horario {
  inicio: string;
  fin: string;
}

export interface ReservaZona {
  /** Identificador real en la base. Es el que usan las mutaciones. */
  uuid?: string;
  id: number;
  unidadId?: string;
  zonaId: string;
  depto: string;
  nombre: string;
  acompanantes: number;
  reservaNum: string;
  horario: string;
  estado: string;
  personas: PersonaReserva[];
  fecha?: string;
  duracion?: string;
  comentarios?: string;
  comprobante?: string | null;
  requiereAprobacion?: boolean;
  /** La misma fecha en ISO (`yyyy-MM-dd`), para ordenar y comparar. */
  fechaIso?: string;
  /** Quien pidio la reserva. Es la FK real, no un nombre. */
  solicitadaPor?: string;
  /** La pidio quien tiene la sesion abierta. La calcula `obtenerReservas`. */
  esMia?: boolean;
}

export interface PersonaReserva {
  /** Identificador real; reemplaza al indice dentro del array. */
  uuid?: string;
  nombre: string;
  llego: boolean | 'salio';
  tipoParticipante: string;
}
