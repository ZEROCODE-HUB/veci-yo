/**
 * Tipos de zonas comunes.
 *
 * El store desaparecio: los datos viven en Supabase y `useZonas` es la unica
 * fuente de verdad. Se conservan aqui las interfaces porque las pantallas las
 * siguen usando como forma de vista, y el repositorio las deriva de la tabla
 * `zona_comun`.
 */

export interface ZonaComunConfig {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  horariosDisponibles: string[];
  duracionMaximaMin: number;
  reglas: string;
  capacidadMaxima: number;
  requiereAprobacion: boolean;
  disponibles?: number;
  /**
   * Cuantas reservas caben a la vez en la zona: 1 en la piscina, 4 en la
   * lavanderia. El mapeo lo pone y el tipo no lo declaraba, asi que la pantalla
   * lo leia con `(zonaConfig as any)?.total` --y con eso un nombre mal escrito
   * habria dado 1 cupo en todas las zonas, sin un solo error--.
   */
  total?: number;
  usaSlots?: boolean;
  /** Franja en la que la zona esta abierta, en HH:mm. */
  horarioApertura?: string;
  horarioCierre?: string;
  /** Importes de la zona, en la moneda del condominio. */
  costoReserva?: number;
  costoLimpieza?: number;
  montoGarantia?: number;
  moneda?: string | null;
}

export interface GestionZona {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  imagen: string | null;
  horarioApertura: string;
  horarioCierre: string;
  duracionMinimaMin: number;
  duracionMaximaMin: number;
  tiempoMinimoEntreReservas: number;
  diasHabilitados: string[];
  fechasEspeciales: Array<{
    fecha: string;
    tipo: string;
    motivo: string;
    horaApertura?: string;
    horaCierre?: string;
  }>;
  montoGarantia: number;
  costoLimpieza: number;
  costoReserva: number;
  moneda: string;
  activa: boolean;
  usaSlots?: boolean;
  horariosDisponibles?: string[];
  reglamento?: string;
  requiereAprobacion?: boolean;
  /** Que hace falta para que se la aprueben. Solo si la requiere. */
  condicionesAprobacion?: string;
  /**
   * La clave del icono elegido de la galeria. Se llama `emoji` por historia:
   * la columna nacio para guardar uno y nunca se uso.
   */
  emoji?: string;
  permiteCorta?: boolean;
  permiteLarga?: boolean;
}

