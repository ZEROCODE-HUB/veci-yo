import type { RolActivo } from "@/shared/types";
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

/**
 * Si este rol participa en la encuesta: vota y, al cerrar, ve los resultados.
 *
 * El huésped temporal no vota nunca. La portería solo cuando la encuesta va
 * dirigida a ella: antes no votaba nunca, así que una encuesta «solo para la
 * portería» se le abría sin opciones (T-009, 20/10/2026). La base ya se lo
 * permitía --`voto_propio_escritura` pide verla y ser del edificio--.
 */
export function participaEnLaEncuesta(
  anuncio: Pick<Anuncio, "votacion" | "paraPorteria">,
  rol: RolActivo | null | undefined,
) {
  if (!anuncio.votacion) return false;
  if (rol === "huesped-temporal") return false;
  if (rol === "guardia") return Boolean(anuncio.paraPorteria);
  return true;
}
