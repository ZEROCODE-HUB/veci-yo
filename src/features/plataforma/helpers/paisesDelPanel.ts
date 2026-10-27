import type { PaisDelPanel } from "../services/plataforma.repo";

/**
 * Los países que se enseñan en el panel: solo donde Veciyo opera, es decir,
 * con alta de edificios o con algún edificio ya dado de alta (26/10/2026: el
 * cliente pidió «solo Colombia y Perú»).
 *
 * Los demás siguen en la tabla `pais` y no se borran: los usan la nacionalidad
 * de los huéspedes extranjeros y los prefijos de teléfono.
 */
export function paisesDelPanel(paises: PaisDelPanel[]): PaisDelPanel[] {
  return paises.filter((p) => p.altaDeEdificio || p.edificios > 0);
}
