export interface CumplimientoDepartamento {
  antirruido: boolean;
  noFumar: boolean;
  sensor: boolean;
}

export interface DepartamentoRentaCorta {
  id: string;
  departamento: string;
  /** La unidad pidió no identificarse ante los demás residentes. */
  ocultarNumero: boolean;
  torre: string;
  piso: string;
  responsable: string;
  estado: string;
  administrador: string;
  anfitrion: string;
  propietario: string;
  /** Ausente cuando la unidad pidió ocultar su contacto. */
  telAdmin?: string;
  telAnfitrion?: string;
  telPropietario?: string;
  mascotas: boolean;
  cumplimiento: CumplimientoDepartamento;
  /** Cuándo verificó la administración el equipamiento; null si nunca. */
  verificadaEn: string | null;
}

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
