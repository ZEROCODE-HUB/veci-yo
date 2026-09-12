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
  id: number;
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
  esMia?: boolean;
}

export interface PersonaReserva {
  nombre: string;
  llego: boolean | 'salio';
  tipoParticipante: string;
}
