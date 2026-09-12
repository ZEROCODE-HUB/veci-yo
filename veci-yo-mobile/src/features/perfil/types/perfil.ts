import type { Reclamo, Seguridad } from '@/stores/perfil-store';

export type { Reclamo, Seguridad };

export interface GuardiaPerfil {
  nombre: string;
  garita: string;
  turnos?: { dia: string; hora: string }[];
}

export interface ReclamoFormulario {
  titulo: string;
  descripcion: string;
  modelo: string;
  categoria: string;
  subcategoria: string;
  destinatario: string;
  correo: string;
  telefono: string;
  medioContacto: string;
  departamentoDenunciado: string;
  torreDenunciada: string;
  viviendaDenunciada: string;
}

export type SeguridadFormulario = Pick<
  Seguridad,
  'correoRespaldo' | 'faceId' | 'huellaDactilar' | 'f2a' | 'pausarCuenta'
>;

