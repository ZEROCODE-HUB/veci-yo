export interface Notificacion {
  id: number;
  emoji: string;
  titulo: string;
  mensaje: string;
  hora: string;
  fecha: string;
  leida: boolean;
}

export interface ReputacionInsignia {
  key: string;
  emoji: string;
  label: string;
  cantidad: number;
}

export interface IngresoSalida {
  id: number;
  nombre: string;
  tipo: string;
  depto: string;
  horaIngreso: string;
  horaSalida: string;
  estado: string;
}

export interface AgendaItem {
  id: number;
  titulo: string;
  hora: string;
}

export type RolNotificaciones = "residente" | "guardia" | "administrador";
