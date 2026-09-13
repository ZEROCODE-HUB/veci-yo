export type {
  CumplimientoDepartamento,
  DepartamentoRentaCorta,
} from "../reglasMockData";

export type TipoRegla =
  | "residente-permanente"
  | "huesped-temporal"
  | "guardia-seguridad";

export interface ReglaSeccion {
  title: string;
  items: string[];
}

export interface ReglaContenido {
  title: string;
  file: string;
  sections: ReglaSeccion[];
  downloadable: boolean;
}
