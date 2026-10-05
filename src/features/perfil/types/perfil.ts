import type { Turno } from "@/shared/types";
import type { Seguridad } from "@/stores/perfil-store";
import type { Reclamo } from "../services";

export type { Reclamo, Seguridad };

export interface GuardiaPerfil {
  nombre: string;
  garita: string;
  turnos?: Turno[];
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
  /** El pais del telefono, en ISO 3166-1 alfa-2. */
  codigoPais: string;
  medioContacto: string;
  departamentoDenunciado: string;
  torreDenunciada: string;
  viviendaDenunciada: string;
}

export type SeguridadFormulario = Pick<
  Seguridad,
  'correoRespaldo' | 'pausarCuenta'
>;

