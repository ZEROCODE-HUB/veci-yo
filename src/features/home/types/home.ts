export interface Notificacion {
  id: string;
  emoji: string;
  titulo: string;
  mensaje: string;
  hora: string;
  fecha: string;
  leida: boolean;
  /** El motivo (`motivo_notificacion`): decide a qué pantalla lleva. */
  tipo: string;
  /** Tabla y fila a las que lleva al tocarla; nulo si no lleva a ningún sitio. */
  entidadTipo: string | null;
  entidadId: string | null;
  /** A quién iba dirigida la publicación del aviso; nulo: para cualquier rol. */
  audiencia?: import("@/shared/utils/audienciaPorRol").Audiencia | null;
}

export interface ReputacionInsignia {
  /** Mismo dato que `emoji`; las pantallas heredaron dos nombres. */
  icono: string;
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
  id: string;
  titulo: string;
  hora: string;
}

// `RolNotificaciones` desaparecio: la bandeja es de la persona, no del rol.
