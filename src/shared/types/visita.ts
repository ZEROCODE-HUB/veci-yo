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
  /** El anfitrión dice que trae mascota (QA 23/10/2026). */
  traeMascota?: boolean;
  /** Cuántos vehículos dijo el anfitrión que vienen. */
  vehiculosPrevistos?: number;
  /** Las mascotas que registró el huésped en su preregistro. */
  mascotas?: { uuid: string; tipo: "perro" | "gato" | "otra"; nombre: string }[];
  /** De dónde salió: creada en Veciyo o importada del calendario de Airbnb. */
  origen?: "veciyo" | "calendario";
  /** De qué plataforma viene la reserva (16/10/2026). Solo huéspedes. */
  plataforma?: PlataformaReserva;
  /**
   * Alguien de la estancia espera la decisión del anfitrión. Lo dice la base
   * sin el motivo, que la portería no puede saber (16/10/2026).
   */
  esperaAlAnfitrion?: boolean;
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
  /** Días en que viene un profesional permanente: 0 domingo a 6 sábado. */
  diasTrabajo?: number[];
  /** Cada vez que entró y salió, de la más reciente a la más antigua. */
  jornadas?: JornadaDeVisita[];
  profesion?: string;
  profesionOtro?: string;
  paraAdministracion?: boolean;
  llego?: boolean;
  ciVerificado?: boolean;
  instruccionesCumplidas?: Record<string, boolean>;
}

/** Una entrada de un profesional permanente, con su salida si ya salió. */
export interface JornadaDeVisita {
  id: string;
  /** `dd/MM/yyyy`, el día del edificio en que entró. */
  fecha: string;
  /** `HH:mm`. */
  entrada: string;
  salida?: string;
  /** Vino un día que no es de los suyos. */
  fueraDeDia: boolean;
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
  /** Si la porteria ya guardo su foto del documento que le enseñaron. */
  fotoDePorteria?: boolean;
  esMenor?: boolean;
  tieneTutela?: boolean;
  /** Quien responde por este menor: otro invitado de la misma estancia. */
  responsableId?: string;
  /** Que es suyo. Padre y madre no necesitan papel; tutor legal y otro, si. */
  parentesco?: "padre" | "madre" | "tutor_legal" | "otro";
  /** Si ya se subio su autorizacion firmada. */
  tieneAutorizacion?: boolean;
  /** Rutas en el bucket `visitas` del permiso del menor (imagen o PDF). */
  autorizacionRutas?: string[];
  terminosExcepcion?: boolean;
  terminosAprobadoPor?: string;
  /** Si acepto las reglas del edificio en su preregistro. No son los terminos. */
  reglasAceptadas?: boolean;
  /**
   * La declaracion del titular, cuando esta persona no pudo registrarse por si
   * misma. El texto lo redacto la base al firmar; aqui solo se enseña.
   */
  declaracionDeIncapacidad?: string;
  /**
   * La verificacion de antecedentes, ya resuelta en un estado. La regla esta
   * en `estadoDeLaVerificacion` (14/10/2026).
   */
  verificacion?:
    | "sin_iniciar"
    | "en_curso"
    | "aprobada"
    | "revision"
    | "aprobada_manual"
    | "rechazada";
  /** Por que requiere la decision del anfitrion, si la requiere. */
  motivoRevision?: "hallazgo" | "sin_consulta" | "incapacidad" | "menor";
  /** Lo que anotó la portería al recibir a este menor. */
  revisionMenor?: "se_parece" | "no_se_parece_seguro" | "no_se_parece_revisar";
  /** Lo que escribio el anfitrion al decidir. */
  revisionNota?: string;
  /** Si hay informe del proveedor que abrir (no lo hay de una simulada). */
  tieneInforme?: boolean;
  /** Si ya creó su cuenta en la app (la estancia quedó enlazada a ella). */
  tieneCuenta?: boolean;
  timeline?: Record<string, boolean | string | null>;
  traSireReported?: boolean;
  /** El reporte a la TRA de esta persona: enviado, simulado o fallido. */
  traEstado?: "enviado" | "simulado" | "fallido";
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
  /** Los apellidos, aparte: la portería los compara con el documento escaneado. */
  apellidos?: string;
  fechaNacimiento?: string;
}

export interface Vehiculo {
  uuid?: string;
  placa: string;
  tipo?: string;
  /**
   * El nombre de quien responde por el: un adulto de la misma estancia. Vacio
   * en los de antes del 09/10/2026 y en los que apunta el anfitrion al
   * reservar, que no lo dice.
   */
  responsable?: string;
}

/** De dónde viene una reserva de huésped temporal. Es el enum `plataforma_reserva`. */
export type PlataformaReserva = "airbnb" | "booking" | "directo" | "otra";
