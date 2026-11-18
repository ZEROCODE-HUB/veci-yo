import type { Deposito, Porteria, Torre, Unidad } from "@/stores/admin-store";
import type { Database } from "@/shared/types/database.types";
import { paisPorDefecto } from "@/shared/constants";

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
  /*
    Al crear (16/11/2026): «¿desde qué piso empiezan los departamentos?»,
    «¿hasta qué piso?», «¿cuántos por piso?» y la numeración. Sustituyen al
    rango «Desde 101 / Hasta 105», que sacaba el piso dividiendo el código.
  */
  pisoDesde: string;
  pisoHasta: string;
  porPiso: string;
  numeracion: "numero" | "letra";
  /** Privados y de visita por nivel, con la nomenclatura del nivel como clave. */
  cocherasPorNivel: Record<string, { privados: string; visita: string }>;
  /** Niveles escritos a mano en el alta que todavía no existen. */
  nivelesNuevos: Array<{ nombre: string; nomenclatura: string }>;
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
  /** El uuid de la tipología, o vacío si no tiene. */
  tipologiaId: string;
  /** Índice de votación en %, como texto del campo. Vacío = sin poner (18/11/2026). */
  indiceVotacion: string;
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
  /** El nivel, obligatorio al crear (16/11/2026). */
  nivelId: string;
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
  /** La torre, solo para una garita de torre (16/11/2026). */
  torreId: string;
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
  pisoDesde: "",
  pisoHasta: "",
  porPiso: "",
  numeracion: "numero",
  cocherasPorNivel: {},
  nivelesNuevos: [],
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
    ? {
        codigo: unit.codigo,
        piso: String(unit.piso),
        estado: unit.estado,
        tipologiaId: unit.tipologiaId ?? "",
        indiceVotacion: unit.indiceVotacion == null ? "" : String(unit.indiceVotacion).replace(".", ","),
      }
    : { codigo: "", piso: "1", estado: "disponible", tipologiaId: "", indiceVotacion: "" };
}

export function depositToForm(deposit?: Deposito | null): DepositFormValues {
  return deposit
    ? {
        codigo: deposit.codigo,
        ubicacion: deposit.ubicacion,
        // `String(null)` es «null», y eso viajaba a una columna uuid.
        unidadId: deposit.unidadId ? String(deposit.unidadId) : "",
      }
    : { codigo: "", ubicacion: "", unidadId: "" };
}

export function estacionamientoToForm(
  item?: EstacionamientoDeTorre | null,
): EstacionamientoFormValues {
  return item
    ? {
        codigo: item.codigo,
        tipo: item.tipo,
        nivelId: item.nivelId ?? "",
        ubicacion: item.ubicacion,
        unidadId: item.unidadId ?? "",
      }
    : { codigo: "", tipo: "visitante", nivelId: "", ubicacion: "", unidadId: "" };
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
  /** Vacío en las de antes del 16/11/2026. */
  nivelId: string | null;
  /** El nombre del nivel («Sótano 1»), para enseñarlo junto al código. */
  nivel: string;
};

export function porteriaToForm(item?: Porteria | null): PorteriaFormValues {
  return item
    ? {
        nombre: item.nombre,
        tipo:
          item.tipo === "acceso_vehicular" || item.tipo === "garita_torre"
            ? item.tipo
            : "entrada_principal",
        ubicacion: item.ubicacion || "",
        telefono: item.telefono || "",
        codigoPais: item.codigoPais || paisPorDefecto(),
        torreId: item.torreId ?? "",
      }
    : {
        nombre: "",
        tipo: "entrada_principal",
        ubicacion: "",
        telefono: "",
        codigoPais: paisPorDefecto(),
        torreId: "",
      };
}
