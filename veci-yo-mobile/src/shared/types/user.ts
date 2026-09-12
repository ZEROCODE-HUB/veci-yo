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
  direccion: string;
  alias?: string;
  favorito: boolean;
  torreNumero?: number;
  deptoNumero?: number;
  codigo?: string;
  imagen?: string | null;
}
