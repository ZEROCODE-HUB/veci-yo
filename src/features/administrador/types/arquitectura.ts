import type { Deposito, Porteria, Torre, Unidad } from "@/stores/admin-store";
import type { Database } from "@/shared/types/database.types";
import { PAIS_POR_DEFECTO } from "@/shared/constants";

export type CompanyContactFormValues = {
  nombre: string;
  telefono: string;
  correo: string;
};

export type TeamMemberFormValues = CompanyContactFormValues & {
  cargo: string;
};

export type CondominioFormValues = {
  nombre: string;
  direccion: string;
  ruc: string;
  foto: string | null;
  numTorres: string;
  sotanosCompartidos: string;
  porteriaCompartida: string;
  ingresosVehiculares: string;
  ingresosPeatonales: string;
  team: TeamMemberFormValues[];
  security: CompanyContactFormValues;
  cleaning: CompanyContactFormValues;
};

export type TowerFormValues = {
  nombre: string;
  depto: string;
  penthouse: string;
  tipo: string;
  nomenclaturaDesde: string;
  nomenclaturaHasta: string;
  pisos: string;
  sotanos: string;
  cocherasVisitas: string;
  cocherasPrivadas: string;
  almacenPrivados: string;
  entradasPeatonales: string;
  entradasVehiculares: string;
  ubicacionParkingVisitas: string;
};

export type UnitFormValues = {
  codigo: string;
  piso: string;
  /*
    El enum de la base y no una cadena libre: el formulario ofrece cuatro
    estados concretos, y al guardar se mandaba con `as any` --asi que una
    etiqueta mal escrita habria llegado a una columna que la rechaza--.
  */
  estado: Database["public"]["Enums"]["estado_unidad"];
};

export type DepositFormValues = {
  codigo: string;
  ubicacion: string;
  unidadId: string;
};

export type EstacionamientoFormValues = {
  codigo: string;
  /** `visitante` o `privado`, que son los dos que acepta la base. */
  tipo: "visitante" | "privado";
  ubicacion: string;
  /** Vacio para una cochera de visita: no es de nadie. */
  unidadId: string;
};

export type PorteriaFormValues = {
  nombre: string;
  /**
   * Peatonal o vehicular. La pantalla creaba todas como peatonales, a fuego.
   *
   * Arranca en `entrada_principal` porque es lo que tienen todos los edificios
   * y lo que habia hasta ahora: no cambia lo que ya existe.
   */
  tipo: Database["public"]["Enums"]["tipo_porteria"];
  ubicacion: string;
  telefono: string;
  /** El pais del telefono, en ISO 3166-1 alfa-2. */
  codigoPais: string;
};

export type ArchitectureSnapshot = {
  torres: Torre[];
  porterias: Porteria[];
  unidades: Unidad[];
  depositos: Deposito[];
};

export const emptyTower: TowerFormValues = {
  nombre: "",
  depto: "",
  penthouse: "",
  tipo: "",
  nomenclaturaDesde: "",
  nomenclaturaHasta: "",
  pisos: "",
  sotanos: "",
  cocherasVisitas: "",
  cocherasPrivadas: "",
  almacenPrivados: "",
  entradasPeatonales: "",
  entradasVehiculares: "",
  ubicacionParkingVisitas: "",
};

export const defaultCondominio: CondominioFormValues = {
  nombre: "Las Barranqueras",
  direccion: "",
  ruc: "",
  foto: null,
  numTorres: "3",
  sotanosCompartidos: "Si",
  porteriaCompartida: "Si",
  ingresosVehiculares: "",
  ingresosPeatonales: "",
  team: [{ nombre: "", cargo: "", telefono: "", correo: "" }],
  security: { nombre: "", telefono: "", correo: "" },
  cleaning: { nombre: "", telefono: "", correo: "" },
};

export function towerToForm(tower?: Torre | null): TowerFormValues {
  return { ...emptyTower, ...(tower ?? {}) };
}

export function unitToForm(unit?: Unidad | null): UnitFormValues {
  return unit
    ? { codigo: unit.codigo, piso: String(unit.piso), estado: unit.estado }
    : { codigo: "", piso: "1", estado: "disponible" };
}

export function depositToForm(deposit?: Deposito | null): DepositFormValues {
  return deposit
    ? {
        codigo: deposit.codigo,
        ubicacion: deposit.ubicacion,
        unidadId: String(deposit.unidadId),
      }
    : { codigo: "", ubicacion: "Sotano -2", unidadId: "" };
}

export function estacionamientoToForm(
  item?: EstacionamientoDeTorre | null,
): EstacionamientoFormValues {
  return item
    ? {
        codigo: item.codigo,
        tipo: item.tipo,
        ubicacion: item.ubicacion,
        unidadId: item.unidadId ?? "",
      }
    : { codigo: "", tipo: "visitante", ubicacion: "", unidadId: "" };
}

/** Lo que devuelve `obtenerArquitectura` para cada cochera. */
export type EstacionamientoDeTorre = {
  uuid: string;
  codigo: string;
  ubicacion: string;
  tipo: "visitante" | "privado";
  unidadId: string | null;
  torreNumero: number | null;
  ocupado: boolean;
};

export function porteriaToForm(item?: Porteria | null): PorteriaFormValues {
  return item
    ? {
        nombre: item.nombre,
        tipo:
          item.tipo === "acceso_vehicular"
            ? "acceso_vehicular"
            : "entrada_principal",
        ubicacion: item.ubicacion || "",
        telefono: item.telefono || "",
        codigoPais: item.codigoPais || PAIS_POR_DEFECTO,
      }
    : {
        nombre: "",
        tipo: "entrada_principal",
        ubicacion: "",
        telefono: "",
        codigoPais: PAIS_POR_DEFECTO,
      };
}
