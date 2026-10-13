import type { Conversation } from "@/shared/types";

export type TabPorteria = "torres" | "seguridad" | "admin";

export interface FiltroPorteria {
  tabActiva: TabPorteria;
  /** El texto de la torre tal y como lo ofrece el selector: «Torre 2». */
  filtroTorre?: string;
  /** El código de la vivienda: «301». */
  filtroDepto?: string;
}

/**
 * Qué conversaciones ve la portería con los filtros puestos.
 *
 * Vive aparte y es pura **para poder invertirla en una prueba**. Es lo mismo
 * que se hizo con `permisosDeComunicacion`: una regla metida dentro de un
 * `useMemo` dentro de un hook no se puede comprobar sin montar media pantalla,
 * y lo que no se comprueba acaba siendo decorativo.
 *
 * ## Por qué mira el dato y no el título
 *
 * Esto decidía leyendo la etiqueta de la conversación:
 *
 *     const esSeguridad = c.nombre.startsWith("Seguridad");
 *     if (filtroDepto && !c.nombre.includes(filtroDepto)) return false;
 *
 * Dos cosas, las dos reales:
 *
 *   · el día que la etiqueta cambie —«Portería» en vez de «Seguridad»— la
 *     pestaña se vacía sola, sin error y sin que nadie sepa por qué. Es la
 *     misma forma que el borde de «está en turno», que no se encendía para
 *     nadie porque un sitio escribía «08:00 - 16:00» y el otro esperaba
 *     «08:00 a 16:00»;
 *   · y buscar el depto «101» casaba también con «1012», porque `includes` no
 *     sabe de límites.
 *
 * `area` y `unidadCodigo` venían en la fila desde el primer día y el mapeo los
 * tiraba al componer el título.
 */
export function pasaElFiltroDePorteria(
  conversacion: Conversation,
  { tabActiva, filtroTorre, filtroDepto }: FiltroPorteria,
): boolean {
  const esSeguridad = conversacion.area === "seguridad";
  const esAdministracion = conversacion.area === "administracion";

  if (tabActiva === "admin") return esAdministracion;

  /*
    La torre y el depto filtran **también en «Seguridad»**, que es donde viven
    los hilos de la portería con cada vivienda. Solo filtraban en «Torres», y
    esa pestaña deja fuera todo hilo de área: los dos selectores no podían
    hacer otra cosa que vaciar una lista que ya estaba vacía (13/10/2026).
  */
  if (tabActiva === "seguridad") {
    if (!esSeguridad) return false;
  } else if (esSeguridad || esAdministracion) {
    // «Torres»: lo que no es de seguridad ni de administración.
    return false;
  }

  if (filtroDepto && conversacion.unidadCodigo !== filtroDepto) return false;
  // La torre viene con la conversación; ya no se busca dentro del título.
  if (filtroTorre && conversacion.unidadTorre !== filtroTorre) return false;

  return true;
}
