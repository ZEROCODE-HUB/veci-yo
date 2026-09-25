import type { ResidenteDeUnidad } from "./residentes.repo";

/**
 * Quién vive hoy en la vivienda.
 *
 * La pantalla de Configuración decía «Residentes actuales (4)» y debajo no
 * pintaba ni una tarjeta. Dos cosas a la vez, y ninguna se veía sola:
 *
 * 1. El número salía de la lista entera y las tarjetas de una jerarquía de
 *    grupos escrita a mano --inquilino líder, residente, corresidente,
 *    coadministrador-- que no incluía `huesped_temporal`. Un rol que existe en
 *    el enum de la base, se cuenta y no tiene dónde caer se pierde en silencio.
 * 2. «Actuales» no miraba la fecha. De los cuatro huéspedes de la 102, uno
 *    terminó su estancia en agosto y otra llega en octubre. Ninguno de los dos
 *    vive ahí hoy, y sin embargo contaban.
 *
 * La regla vive aquí, fuera del componente, porque una fecha en un `.tsx` es
 * una fecha que nadie puede probar sin montar la pantalla.
 */

/** `yyyy-MM-dd` en hora local, que es como la base guarda estas dos columnas. */
export function hoyEnFecha(momento: Date = new Date()): string {
  const mes = String(momento.getMonth() + 1).padStart(2, "0");
  const dia = String(momento.getDate()).padStart(2, "0");
  return `${momento.getFullYear()}-${mes}-${dia}`;
}

/**
 * Si la estancia de alguien cubre el día dado.
 *
 * Los dos extremos entran: quien llega hoy ya es residente --por eso recibe
 * hoy las credenciales de la puerta-- y quien se va hoy todavía lo es.
 * Un extremo vacío es un lado abierto, que es lo que tienen los roles
 * permanentes: un propietario no empieza ni termina.
 */
export function estaVigente(
  residente: Pick<ResidenteDeUnidad, "vigenteDesde" | "vigenteHasta">,
  hoy: string,
): boolean {
  if (residente.vigenteDesde && residente.vigenteDesde > hoy) return false;
  if (residente.vigenteHasta && residente.vigenteHasta < hoy) return false;
  return true;
}

export function residentesActuales(
  residentes: readonly ResidenteDeUnidad[],
  hoy: string = hoyEnFecha(),
): ResidenteDeUnidad[] {
  return residentes.filter((residente) => estaVigente(residente, hoy));
}
