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
  id: string;
  tipo: 'entrante' | 'saliente' | 'perdida';
  contacto: string;
  duracion: string;
  hora: string;
  fecha: string;
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
  /**
   * Cuando se envio el ultimo mensaje, en ISO. Ordena la lista.
   *
   * El repositorio lo ponia y el tipo no lo declaraba, asi que el `as
   * Conversation` del mapeo lo borraba: el `sort` que lee este campo compilaba
   * por el `any` de la fila, y cualquiera que leyera el tipo creeria que la
   * lista no se puede ordenar por fecha.
   */
  ultimoEnviadoEn?: string | null;
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
