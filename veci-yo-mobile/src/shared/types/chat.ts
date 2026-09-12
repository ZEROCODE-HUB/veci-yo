export interface MensajeChat {
  id: number | string;
  de: string;
  texto: string;
  hora: string;
  fecha: string;
  avatarEmoji?: string;
  leido: boolean;
  persona?: string;
}

export interface GrupoChat {
  id: string;
  tipo: 'residentes' | 'personal' | 'admin';
  nombre: string;
  avatarEmoji: string;
  mensajes: MensajeChat[];
}

export interface LlamadaHistorial {
  id: number;
  tipo: 'entrante' | 'saliente' | 'perdida';
  contacto: string;
  duracion?: string;
  hora: string;
  fecha: string;
  emoji?: string;
}

export interface Conversation {
  id: string;
  tipo: 'individual' | 'grupo';
  nombre: string;
  ultimoMensaje: string;
  ultimaHora: string;
  ultimaFecha: string;
  avatarEmoji: string;
  noLeidos: number;
  grupoId?: string;
}

export interface Notificacion {
  id: number;
  emoji: string;
  titulo: string;
  mensaje: string;
  hora: string;
  fecha: string;
  leida: boolean;
}
