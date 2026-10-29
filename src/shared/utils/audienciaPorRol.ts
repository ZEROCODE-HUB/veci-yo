import type { RolActivo } from "@/shared/types";

/** A quién va dirigida una publicación (anuncio o encuesta). */
export interface Audiencia {
  propietarios?: boolean | null;
  residentes?: boolean | null;
  huespedes?: boolean | null;
  porteria?: boolean | null;
}

/**
 * Si una publicación es para el rol con el que se está entrando (29/10/2026,
 * Para Claude 157-158).
 *
 * Quien tiene varios roles --guardia y propietario-- veía como propietario lo
 * que era solo para la portería, y al revés. El rol activo no viaja en el
 * token (regla 8): esto decide qué se enseña con cada rol, y la base sujeta el
 * voto por cómo se vota (`voto_segun_la_audiencia`).
 */
export function esParaElRol(audiencia: Audiencia, rol: RolActivo | null | undefined): boolean {
  switch (rol) {
    case "administrador":
      return true;
    case "guardia":
      return Boolean(audiencia.porteria);
    case "huesped-temporal":
      return Boolean(audiencia.huespedes);
    case "propietario":
      return Boolean(audiencia.propietarios || audiencia.residentes);
    case "propietario-no-residente":
    case "propietario-sin-propiedades":
      return Boolean(audiencia.propietarios);
    default:
      return Boolean(audiencia.residentes);
  }
}
