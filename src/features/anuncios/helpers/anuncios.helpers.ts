import type { Anuncio } from "../types/anuncios";


export function parseAnuncioDate(dateStr: string) {
  const [day, month, year] = dateStr.split("/");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isAnuncioVotingClosed(anuncio?: Anuncio) {
  if (!anuncio?.votacion || !anuncio.fechaFinalizacion) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseAnuncioDate(anuncio.fechaFinalizacion) < today;
}

/**
 * Quienes faltan votar lo calcula la base con `pendientes_votacion`, que cruza
 * los votos contra las unidades reales del condominio. Antes se comparaba
 * contra una lista fija de departamentos que no existen.
 */
export function debeMostrarPendientes(anuncio?: Anuncio) {
  return Boolean(anuncio?.votacion && isAnuncioVotingClosed(anuncio));
}
