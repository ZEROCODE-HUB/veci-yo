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

export type ModoAuth = 'cuenta' | 'incognito' | 'demo' | null;

export type RolActivo =
  | 'guardia'
  | 'administrador'
  | 'propietario'
  | 'propietario-sin-propiedades'
  | 'propietario-no-residente'
  | 'inquilino-lider'
  | 'huesped-temporal'
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
