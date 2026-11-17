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
  /**
   * Lo que **declara el anfitrión**, que es quien sabe qué tiene. Que esté
   * encendido no significa que nadie lo haya comprobado: eso lo dice
   * `verificadaEn`.
   */
  cumplimiento: CumplimientoDepartamento;
  /**
   * Cuándo subió la administración a comprobarlo; null mientras sea solo una
   * declaración, que es el caso normal. Se borra sola en cuanto el anfitrión
   * cambia cualquiera de las tres casillas.
   */
  verificadaEn: string | null;
  /** Quién lo comprobó. Llega solo mientras la verificación siga vigente. */
  verificadaPor: string | null;
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
  /** Ruta en el depósito; vacía si no se subió ningún archivo. */
  file: string;
  /**
   * El nombre con que se subió el archivo (17/11/2026). Null en los subidos
   * antes de guardarlo: la pantalla dice entonces qué es, no la ruta.
   */
  fileName: string | null;
  /** Cuándo se subió el archivo; lo pone la base. */
  subidoEn: Date | null;
  sections: ReglaSeccion[];
  downloadable: boolean;
}
