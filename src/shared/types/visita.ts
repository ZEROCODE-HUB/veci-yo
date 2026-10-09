import type { Database } from "./database.types";

export interface VisitaItem {
  /** Identificador real en la base. Es el que usan todas las mutaciones. */
  uuid?: string;
  /** Derivado del uuid. Solo para las listas heredadas que comparan numeros. */
  id: number;
  /** Unidad a la que pertenece la visita. */
  unidadId?: string;
  tipo: "amigos" | "temporal" | "permanente" | "huesped-temporal";
  nombre: string;
  ci: string;
  estado: string;
  instruccionDocumento?: "verificar" | "no_verificar";
  aviso?: "solo_notificar" | "notificar_y_anunciar";
  invitados: Invitado[];
  tieneVehiculo: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  /**
   * Cuantas personas dijo el anfitrion que vienen, contando al titular.
   *
   * No es lo mismo que `invitados.length`: una estancia nace con el titular y
   * nada mas --los acompañantes sin nombre no se crean, los rellena el huesped
   * desde su enlace-- asi que la tarjeta decia «1 persona» en una reserva para
   * dos. Indefinido en lo anterior al 09/10/2026 y en lo que entra por el
   * calendario de Airbnb.
   */
  huespedesPrevistos?: number;
  /** Cuantos de ellos se esperan menores de edad. Lo dijo el anfitrion. */
  menoresPrevistos?: number;
  esEvento: boolean;
  nombreEvento?: string;
  vehiculos: Vehiculo[];
  qrUrl?: string;
  reserva?: string;
  torre?: string;
  depto?: string;
  personas?: number;
  horaIngreso?: string;
  horaSalida?: string;
  /** El día en que se registró la entrada, que no tiene por qué ser el previsto. */
  fechaIngreso?: string;
  fechaSalida?: string;
  horaEstimadaLlegada?: string;
  horaEstimadaSalida?: string;
  registradoPor?: string;
  autorizadoPor?: string;
  autorizadoPorRol?: string;
  anotacionesIngreso?: string;
  anotacionesSalida?: string;
  fotosIngreso?: string[];
  fotosSalida?: string[];
  estacionamientosAsignados?: number;
  codigoAcceso?: string;
  telefonoResidente?: string;
  /** Quien responde por esta vivienda, para que la porteria sepa a quien llama. */
  nombreResidente?: string;
  esMenor?: boolean;
  tieneTutela?: boolean;
  diasLaborales?: string;
  profesion?: string;
  profesionOtro?: string;
  paraAdministracion?: boolean;
  llego?: boolean;
  ciVerificado?: boolean;
  instruccionesCumplidas?: Record<string, boolean>;
}

export interface Invitado {
  /** Identificador real en la base. Reemplaza al indice dentro del array. */
  uuid?: string;
  /** Posicion declarada, no la del array. */
  orden?: number;
  nombre: string;
  llego: boolean;
  favorito?: boolean;
  aprobado?: string;
  documentos?: string[];
  esMenor?: boolean;
  tieneTutela?: boolean;
  /** Quien responde por este menor: otro invitado de la misma estancia. */
  responsableId?: string;
  /** Que es suyo. Padre y madre no necesitan papel; tutor legal y otro, si. */
  parentesco?: "padre" | "madre" | "tutor_legal" | "otro";
  /** Si ya se subio su autorizacion firmada. */
  tieneAutorizacion?: boolean;
  terminosExcepcion?: boolean;
  terminosAprobadoPor?: string;
  timeline?: Record<string, boolean | string | null>;
  traSireReported?: boolean;
  ciVerificado?: boolean;
  horaIngreso?: string;
  horaSalida?: string;
  /** El día en que se registró la entrada, que no tiene por qué ser el previsto. */
  fechaIngreso?: string;
  fechaSalida?: string;
  /**
   * El tipo de documento, con la **clave** del enum de la base.
   *
   * Era `string`, asi que las pantallas lo pintaban tal cual y el guardia leia
   * «cedula_ciudadania 1098765432» donde tiene que leer «Cedula de ciudadania».
   * Para mostrarlo se traduce con `TIPO_DOCUMENTO`, que existe justo para eso.
   */
  tipoDocumento?: Database["public"]["Enums"]["tipo_documento"];
  documentoNumero?: string;
  fechaNacimiento?: string;
}

export interface Vehiculo {
  uuid?: string;
  placa: string;
  tipo?: string;
}
