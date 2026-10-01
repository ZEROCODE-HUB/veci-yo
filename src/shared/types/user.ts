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
