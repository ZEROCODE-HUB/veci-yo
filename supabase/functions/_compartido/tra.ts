/**
 * La Tarjeta de Registro de Alojamiento (TRA) del MinCIT.
 *
 * Resolución 409 de 2022. Dos llamadas:
 *
 *   · el **huésped principal** a `/one/`, que devuelve un `code`;
 *   · cada **acompañante** a `/two/`, mandando ese `code` como `padre`.
 *
 * Aquí vive solo el armado del cuerpo, que es la parte que se puede probar sin
 * salir a internet y donde están todas las trampas. El envío está al lado.
 */

/**
 * Cómo nombra el ministerio cada documento y cada motivo (28/10/2026).
 *
 * Vivían aquí escritos a mano; ahora salen de la base --las siglas de cada
 * documento en `catalogo_opcion` (`tipos_de_documento`, `extra.siglas_tra`), los
 * motivos en `motivos_de_viaje` (`extra.tra`)-- y se cambian en Panel › Más ›
 * Listas. Las direcciones del ministerio son ajustes (`tra_url_principal`,
 * `tra_url_acompanante`).
 *
 * El enum de la base nombra los documentos de Colombia y de Perú; la TRA es
 * colombiana y espera sus propias siglas. Lo que no tiene equivalente se manda
 * como `sinEquivalente` (hoy «Pasaporte», que es como entra un extranjero).
 * Ojo con los dos de un menor: «R.C» y «T.I». Sin ellos un menor colombiano se
 * declararía como extranjero con pasaporte, un dato malo que encaja.
 */
export interface NombresTra {
  documentos: Record<string, string | null>;
  motivos: Record<string, string>;
  motivoPorDefecto: string;
  sinEquivalente: string;
}

export interface FilaDeLista {
  codigo: string;
  extra: Record<string, unknown> | null;
}

/** De las filas de las dos listas a lo que necesita el armado. */
export function nombresTraDe(
  documentos: FilaDeLista[],
  motivos: FilaDeLista[],
  sinEquivalente: string,
): NombresTra {
  const doc: Record<string, string | null> = {};
  for (const d of documentos) {
    const siglas = d.extra?.siglas_tra;
    doc[d.codigo] = typeof siglas === "string" && siglas.trim() ? siglas.trim() : null;
  }
  const mot: Record<string, string> = {};
  let porDefecto: string | null = null;
  for (const m of motivos) {
    const tra = m.extra?.tra;
    if (typeof tra !== "string" || !tra.trim()) continue;
    mot[m.codigo] = tra.trim();
    if (m.extra?.por_defecto_tra === true) porDefecto = tra.trim();
  }
  if (!porDefecto) {
    throw new Error("Ningún motivo de viaje está marcado como el de por defecto para la TRA");
  }
  return { documentos: doc, motivos: mot, motivoPorDefecto: porDefecto, sinEquivalente };
}

const siglas = (nombres: NombresTra, tipo: string | null) =>
  nombres.documentos[tipo ?? ""] ?? nombres.sinEquivalente;

export interface PersonaTra {
  nombres: string;
  apellidos: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  ciudadResidencia: string | null;
  ciudadProcedencia: string | null;
}

export interface EstanciaTra {
  numeroHabitacion: string;
  checkIn: string;
  checkOut: string;
  motivo: string | null;
  numeroAcompanantes: number;
  tipoAcomodacion: string;
  costo: number | null;
  nombreEstablecimiento: string;
  rnt: string | null;
}

/**
 * El cuerpo del huésped principal.
 *
 * **`cuidad_residencia` y `cuidad_procedencia` van mal escritos a propósito.**
 * Así se llaman en la API del ministerio —con la errata— y mandarlos bien
 * escritos es mandarlos a un campo que no existe. Es la clase de detalle que
 * cuesta un día si no está dicho en voz alta.
 */
export function cuerpoPrincipal(
  persona: PersonaTra,
  estancia: EstanciaTra,
  nombres: NombresTra,
): Record<string, string> {
  return {
    tipo_identificacion: siglas(nombres, persona.tipoDocumento),
    numero_identificacion: persona.documento ?? "",
    nombres: persona.nombres,
    apellidos: persona.apellidos ?? "",
    cuidad_residencia: persona.ciudadResidencia ?? "",
    cuidad_procedencia: persona.ciudadProcedencia ?? "",
    numero_habitacion: estancia.numeroHabitacion,
    motivo: nombres.motivos[estancia.motivo ?? ""] ?? nombres.motivoPorDefecto,
    numero_acompanantes: String(estancia.numeroAcompanantes),
    check_in: estancia.checkIn,
    check_out: estancia.checkOut,
    tipo_acomodacion: estancia.tipoAcomodacion,
    // El ministerio lo quiere como texto aunque sea dinero. Sin decimales:
    // lo que espera es un entero en pesos.
    costo: estancia.costo === null ? "0" : String(Math.round(estancia.costo)),
    nombre_establecimiento: estancia.nombreEstablecimiento,
    rnt_establecimiento: estancia.rnt ?? "",
  };
}

/** El cuerpo de un acompañante. Lleva menos, y lleva el `padre`. */
export function cuerpoAcompanante(
  persona: PersonaTra,
  estancia: Pick<EstanciaTra, "numeroHabitacion" | "checkIn" | "checkOut">,
  padre: number,
  nombres: NombresTra,
): Record<string, string | number> {
  return {
    tipo_identificacion: siglas(nombres, persona.tipoDocumento),
    numero_identificacion: persona.documento ?? "",
    nombres: persona.nombres,
    apellidos: persona.apellidos ?? "",
    cuidad_residencia: persona.ciudadResidencia ?? "",
    cuidad_procedencia: persona.ciudadProcedencia ?? "",
    numero_habitacion: estancia.numeroHabitacion,
    check_in: estancia.checkIn,
    check_out: estancia.checkOut,
    padre,
  };
}

/**
 * Lo que falta para poder reportar.
 *
 * Se comprueba **antes** de salir a internet y se devuelve entero, no el primer
 * fallo: al anfitrión hay que decirle todo lo que falta de una vez, no uno por
 * corrida. El ministerio contesta con un error que no distingue cuál campo es.
 */
export function loQueFalta(
  persona: PersonaTra,
  estancia: EstanciaTra,
): string[] {
  const faltan: string[] = [];

  if (!persona.nombres?.trim()) faltan.push("el nombre del huésped");
  if (!persona.documento?.trim()) faltan.push("su documento");
  if (!persona.tipoDocumento) faltan.push("el tipo de documento");
  if (!persona.ciudadResidencia?.trim()) faltan.push("la ciudad donde vive");
  if (!persona.ciudadProcedencia?.trim()) faltan.push("la ciudad de donde viene");
  if (!estancia.rnt?.trim()) faltan.push("el RNT del alojamiento");
  if (estancia.costo === null) faltan.push("el costo de la estancia");

  return faltan;
}
