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

  if (tabActiva === "seguridad") return esSeguridad;
  if (tabActiva === "admin") return esAdministracion;

  // «Torres»: lo que no es de seguridad ni de administración, o sea los hilos
  // con una vivienda.
  if (esSeguridad || esAdministracion) return false;
  if (filtroDepto && conversacion.unidadCodigo !== filtroDepto) return false;
  /*
    La torre sigue saliendo del título porque la conversación no la trae: el
    repositorio pide `unidad:unidad_id ( codigo )` y nada más. Está escrito aquí
    en vez de arreglado a medias para que se vea: el día que haga falta filtrar
    de verdad por torre, lo que hay que hacer es traerla en la consulta.
  */
  if (filtroTorre && !conversacion.nombre.includes(filtroTorre)) return false;

  return true;
}
