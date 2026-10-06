export interface Usuario {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  tipoDocumento: string;
  identificacion?: string;
  verificado: boolean;
  alias?: string;
}

/**
 * Con que entro la persona.
 *
 * Habia un tercer modo, `demo`, que lo ponian los botones de «Explorar otros
 * roles» de la pantalla de entrada: entraban con un Guillermo Paredes inventado
 * y dos casas de mentira. Se retiraron el 06/10/2026 a peticion del cliente
 * --los mockups viven en otro sitio-- y el modo se fue con ellos.
 */
export type ModoAuth = 'cuenta' | 'incognito' | null;

export type RolActivo =
  | 'guardia'
  | 'administrador'
  | 'propietario'
  | 'propietario-sin-propiedades'
  | 'propietario-no-residente'
  | 'inquilino-lider'
  | 'huesped-temporal'
  /*
    Quien opera VeciYo, no un edificio. Es el rol mas alto que existe y a la vez
    el que menos datos de personas ve: da de alta edificios, atiende las PQRS
    sobre la aplicacion y mira conteos. No tiene vivienda ni condominio, asi que
    no comparte **ninguna** pantalla con los demas: su navegacion es la suya.

    Uno solo para los dos roles de la base --`dueno` y `soporte`--, porque los
    dos ven el mismo panel. Lo que cambia entre ellos es lo que pueden hacer
    dentro, y eso viaja aparte en `rolPlataforma`: si fueran dos `RolActivo` se
    duplicaria la navegacion para distinguir dos botones.
  */
  | 'plataforma'
  | null;

export interface Ubicacion {
  id: number;
  /**
   * Rol con el que se opera esta vivienda. Una misma persona puede ser
   * propietaria de una e inquilina o huesped de otra.
   */
  rol?: RolActivo;
  direccion: string;
  alias?: string;
  /**
   * Como llama esta persona a esta vivienda: «La playa». Lo escribe ella y es
   * suyo --dos que comparten casa pueden ponerle motes distintos--, asi que
   * vive en `membresia_unidad`, no en `unidad`.
   *
   * No es `Usuario.alias`, que es el seudonimo de la persona para no figurar
   * con su nombre real en el cuadro de honor y en las reservas.
   */
  apodo?: string;
  /** La membresia a la que pertenece, que es donde se guarda el apodo. */
  membresiaId?: string;
  favorito: boolean;
  torreNumero?: number;
  deptoNumero?: number;
  codigo?: string;
  imagen?: string | null;
  /**
   * Primer dia de la estancia, en ISO. Solo lo trae la vivienda de un huesped
   * temporal, y solo importa cuando es futuro.
   */
  vigenteDesde?: string | null;
}
