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
});

export function formatAnuncioDate(date: Date | null) {
  if (!date) return "dd/mm/aaaa";
  return formatDate(date);
}
