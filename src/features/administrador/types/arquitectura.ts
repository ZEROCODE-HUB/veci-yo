import type { Deposito, Porteria, Torre, Unidad } from "@/stores/admin-store";

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
  estado: string;
};

export type DepositFormValues = {
  codigo: string;
  ubicacion: string;
  unidadId: string;
};

export type PorteriaFormValues = {
  nombre: string;
  ubicacion: string;
  telefono: string;
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

export function porteriaToForm(item?: Porteria | null): PorteriaFormValues {
  return item
    ? {
        nombre: item.nombre,
        ubicacion: item.ubicacion || "",
        telefono: item.telefono || "",
      }
    : { nombre: "", ubicacion: "", telefono: "" };
}
