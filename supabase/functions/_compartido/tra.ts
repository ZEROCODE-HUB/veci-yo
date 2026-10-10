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

export const TRA_PRINCIPAL = "https://pms.mincit.gov.co/one/";
export const TRA_ACOMPANANTE = "https://pms.mincit.gov.co/two/";

/**
 * Los tipos de documento, en las etiquetas del ministerio.
 *
 * El enum de la base nombra los documentos de Colombia y de Perú; la TRA es
 * colombiana y espera sus propias siglas. Lo que no tiene equivalente se manda
 * como pasaporte, que es como entra un extranjero.
 */
export const DOCUMENTO_TRA: Record<string, string> = {
  cedula_ciudadania: "C.C",
  cedula_extranjeria: "C.E",
  pasaporte: "Pasaporte",
  dni: "Pasaporte",
  carne_extranjeria: "Pasaporte",
  pep: "Pasaporte",
  /*
    Los dos de un menor. El ministerio tiene sus propias siglas: «R.C» para el
    registro civil y «T.I» para la tarjeta de identidad, que es con lo que se
    declara a un niño.

    Sin esto caerian en el `?? "Pasaporte"` de abajo y un menor colombiano se
    habria declarado como extranjero con pasaporte. Es la misma forma que el
    pais recortado a dos letras: un dato malo que encaja.
  */
  registro_civil: "R.C",
  tarjeta_identidad: "T.I",
};

/** Los motivos, en las palabras del ministerio. */
export const MOTIVO_TRA: Record<string, string> = {
  turismo: "Turismo",
  negocios: "Negocios",
  trabajo: "Trabajo",
  estudios: "Estudios",
  transito: "Transito",
};

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
): Record<string, string> {
  return {
    tipo_identificacion: DOCUMENTO_TRA[persona.tipoDocumento ?? ""] ?? "Pasaporte",
    numero_identificacion: persona.documento ?? "",
    nombres: persona.nombres,
    apellidos: persona.apellidos ?? "",
    cuidad_residencia: persona.ciudadResidencia ?? "",
    cuidad_procedencia: persona.ciudadProcedencia ?? "",
    numero_habitacion: estancia.numeroHabitacion,
    motivo: MOTIVO_TRA[estancia.motivo ?? ""] ?? "Turismo",
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
): Record<string, string | number> {
  return {
    tipo_identificacion: DOCUMENTO_TRA[persona.tipoDocumento ?? ""] ?? "Pasaporte",
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
