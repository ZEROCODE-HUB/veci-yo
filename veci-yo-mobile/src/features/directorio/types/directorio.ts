import type { Deposito, Tipologia, Unidad } from "@/stores/admin-store";

export interface DirectorioContacto { nombre: string; telefono: string; }
export interface DirectorioContactos { administrador: DirectorioContacto; anfitrion: DirectorioContacto; propietario: DirectorioContacto; }
export interface DirectorioEstacionamiento { id: string; codigo: string; ubicacion: string; torreNumero: number; unidad: Unidad; propietario: string; contactos: DirectorioContactos; }
export interface DirectorioDeposito extends Deposito { unidad?: Unidad; contactos?: DirectorioContactos; }
export type DirectorioTipoDetalle = "departamento" | "estacionamiento" | "deposito";
export interface DirectorioDetalle { tipo: DirectorioTipoDetalle; datos: Unidad | DirectorioEstacionamiento | DirectorioDeposito; contactos: DirectorioContactos; }
export interface DirectorioFiltros { search: string; torre: string; subTab: "departamentos" | "estacionamientos" | "depositos"; }
export type { Deposito, Tipologia, Unidad };
