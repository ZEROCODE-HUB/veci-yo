import { formatDate } from "@/shared/utils";
export interface OpcionAnuncio {
  uuid: string;
  etiqueta: string;
  votos: number;
}

export interface Anuncio {
  /** Identificador real en la base. Es el que usan las mutaciones. */
  uuid?: string;
  id: number;
  categoria: string;
  titulo: string;
  descripcion: string;
  fechaPublicada: string;
  fechaFinalizacion: string;
  fechaCorta: string;
  votacion: boolean;
  progreso?: number;
  umbral?: number;
  ocultarResultados?: boolean;
  /** Si la administración ya decidió enseñar los resultados tras el cierre. */
  resultadosPublicados?: boolean;
  votacionMultiple?: boolean;
  opcionesVotacion?: string[];
  /**
   * Opciones con su recuento agregado. Reemplaza a `votosSi` / `votosNo`, que
   * eran listas de nombres dentro del anuncio: exponian quien voto que.
   */
  opciones?: OpcionAnuncio[];
  totalVotos?: number;
  paraHuespedes?: boolean;
  paraPropietarios?: boolean;
  paraResidentes?: boolean;
  /** Si al publicarse avisó --o avisará-- a su audiencia. */
  avisar?: boolean;
}

export interface AnuncioFormValues {
  tipo: "Anuncio" | "Encuesta";
  titulo: string;
  descripcion: string;
  categoria: string;
  paraPropietarios: boolean;
  paraResidentes: boolean;
  paraHuespedes: boolean;
  urlVideo: string;
  votacion: boolean;
  umbral: string;
  fechaPublicada: Date | null;
  fechaFinalizacion: Date | null;
  opcionesVotacion: Array<{ valor: string }>;
  ocultarResultados: boolean;
  votacionMultiple: boolean;
  /**
   * Si al publicarse se avisa a su audiencia.
   *
   * Lo pidio el cliente el 05/10/2026: «lo mejor seria poder hacerlo
   * parametrizable el tema de anuncio y votacion». Marcada por defecto, porque
   * un anuncio del que nadie se entera no es un anuncio.
   */
  avisar: boolean;
}

export interface AnunciosFiltros {
  search: string;
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  categoria: string;
  encuestaActiva: boolean;
}

export const anunciosCategorias = ["Servicios", "Eventos", "Mantenimiento", "Seguridad", "Administración"];
export const tiposAnuncio = ["Anuncio", "Encuesta"] as const;

export const anuncioFormVacio = (): AnuncioFormValues => ({
  tipo: "Anuncio",
  titulo: "",
  descripcion: "",
  categoria: "",
  paraPropietarios: false,
  paraResidentes: false,
  paraHuespedes: false,
  urlVideo: "",
  votacion: false,
  umbral: "",
  fechaPublicada: null,
  fechaFinalizacion: null,
  opcionesVotacion: [{ valor: "" }, { valor: "" }],
  ocultarResultados: false,
  votacionMultiple: false,
  avisar: true,
});

export function formatAnuncioDate(date: Date | null) {
  if (!date) return "dd/mm/aaaa";
  return formatDate(date);
}
