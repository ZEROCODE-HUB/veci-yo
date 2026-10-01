import { formatDateInput } from "@/shared/utils";
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
  return formatDateInput(momento);
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

/**
 * Quién sale en la lista de residentes, contando a quien mira.
 *
 * Uno se aparta de la lista **solo si su ficha se pinta aparte**, y la tarjeta
 * que la pinta existe unicamente para el propietario. Antes se apartaba
 * siempre, con lo que una inquilina lider no aparecia en ningun sitio de la
 * configuracion de su propia vivienda --ni en la lista ni en una tarjeta-- y el
 * titulo decia «Residentes actuales (1)» donde viven dos. Podia corregir el
 * telefono y la visibilidad de los demas y no los suyos.
 *
 * El mockup no contemplaba el caso --en el prototipo quien mira es siempre el
 * propietario-- pero si ponia al inquilino lider como una fila mas de la lista,
 * que es lo que hace esto. Punto 59 de `REVISAR-A-OJO.md`.
 */
export function residentesDeLaLista(
  todos: readonly ResidenteDeUnidad[],
  usuarioId: string,
  rolActivo: string | null | undefined,
): ResidenteDeUnidad[] {
  const tieneTarjetaPropia = rolActivo === "propietario";
  return todos.filter(
    (residente) => !tieneTarjetaPropia || residente.usuarioId !== usuarioId,
  );
}
