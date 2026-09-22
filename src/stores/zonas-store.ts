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
  duracionPermitida: number;
  reglas: string;
  capacidadMaxima: number;
  requiereAprobacion: boolean;
  disponibles?: number;
  usaSlots?: boolean;
  /** Importes de la zona, en la moneda del condominio. */
  costoReserva?: number;
  costoLimpieza?: number;
  montoGarantia?: number;
  moneda?: string | null;
  restringidaHuesped?: boolean;
}

export interface GestionZona {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  imagen: string | null;
  horarioApertura: string;
  horarioCierre: string;
  duracionMinima: number;
  duracionMaxima: number;
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
  duracionPermitida?: number;
  horariosDisponibles?: string[];
  reglamento?: string;
  requiereAprobacion?: boolean;
  permiteCorta?: boolean;
  permiteLarga?: boolean;
}

