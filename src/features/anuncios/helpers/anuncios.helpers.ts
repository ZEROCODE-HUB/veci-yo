import { esParaElRol, type Audiencia } from "@/shared/utils/audienciaPorRol";
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
  anuncio: Pick<Anuncio, "votacion" | "paraPorteria"> &
    Partial<Pick<Anuncio, "paraPropietarios" | "paraResidentes" | "paraHuespedes">>,
  rol: RolActivo | null | undefined,
) {
  if (!anuncio.votacion) return false;
  if (rol === "huesped-temporal") return false;
  if (rol === "guardia") return Boolean(anuncio.paraPorteria);
  if (rol === "administrador") return true;
  // Solo si es para el rol con el que se entra (Para Claude 157, 29/10/2026).
  return esParaElRol(audienciaDe(anuncio), rol);
}

/** Las casillas de la publicación, con los nombres de `esParaElRol`. */
export function audienciaDe(
  anuncio: Partial<Pick<Anuncio, "paraPropietarios" | "paraResidentes" | "paraHuespedes" | "paraPorteria">>,
): Audiencia {
  return {
    propietarios: anuncio.paraPropietarios ?? true,
    residentes: anuncio.paraResidentes ?? true,
    huespedes: anuncio.paraHuespedes ?? false,
    porteria: anuncio.paraPorteria ?? false,
  };
}

/**
 * Si quien mira ve cómo va una encuesta que sigue abierta.
 *
 * Solo la administración: «no hay forma de ver los resultados de la encuesta»
 * (Para Claude, 21/10/2026), y el permiso del coadministrador ya prometía «Ver
 * encuestas activas, historial y resultados». Los vecinos los ven al cierre,
 * para que el recuento no influya en quien todavía no votó.
 */
export function veResultadosEnCurso(
  anuncio: Pick<Anuncio, "votacion">,
  rol: RolActivo | null | undefined,
  cerrada: boolean,
) {
  return Boolean(anuncio.votacion) && !cerrada && rol === "administrador";
}
