import type { Deposito, Tipologia, Unidad } from "@/stores/admin-store";

export interface DirectorioContacto { nombre: string; telefono: string; }
export interface DirectorioContactos { administrador: DirectorioContacto; anfitrion: DirectorioContacto; propietario: DirectorioContacto; }
export interface DirectorioEstacionamiento { id: string; codigo: string; ubicacion: string; torreNumero: number; unidad: Unidad; propietario: string; contactos: DirectorioContactos; }
export interface DirectorioDeposito extends Deposito { unidad?: Unidad; contactos?: DirectorioContactos; }
export type DirectorioTipoDetalle = "departamento" | "estacionamiento" | "deposito";
/**
 * El detalle que abre el modal, con el tipo y el dato atados.
 *
 * Era `tipo: DirectorioTipoDetalle` y `datos` una union de las tres cosas
 * **sueltas**, asi que TypeScript no podia saber que un detalle de tipo
 * «deposito» lleva un deposito dentro: el modal lo resolvia con
 * `detalle.datos as any` y leia `datos.ubicacion` o `datos.unidad.codigo` sin
 * que nadie comprobara que ese campo existe en esa rama.
 *
 * Asi, `detalle.tipo === "deposito"` estrecha `datos` solo.
 */
export type DirectorioDetalle =
  | { tipo: "departamento"; datos: Unidad; contactos: DirectorioContactos }
  | {
      tipo: "estacionamiento";
      datos: DirectorioEstacionamiento;
      contactos: DirectorioContactos;
    }
  | {
      tipo: "deposito";
      datos: DirectorioDeposito;
      contactos: DirectorioContactos;
    };
export interface DirectorioFiltros { search: string; torre: string; subTab: "departamentos" | "estacionamientos" | "depositos"; }
export type { Deposito, Tipologia, Unidad };
