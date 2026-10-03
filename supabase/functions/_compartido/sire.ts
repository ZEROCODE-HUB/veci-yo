/**
 * El reporte de extranjeros a Migración Colombia (SIRE).
 *
 * ----------------------------------------------------------------------------
 * Lo que de esto es cierto y lo que es provisional
 * ----------------------------------------------------------------------------
 * **SIRE no tiene API.** Es un portal, y la única forma de automatizarlo es
 * generar un archivo plano y subirlo a mano. Los sistemas que dicen que «se
 * integran con SIRE» generan ese archivo.
 *
 * El **formato exacto** del archivo está en el instructivo oficial, que solo se
 * descarga desde dentro del portal con una cuenta ya creada. No lo tenemos.
 *
 * Así que aquí hay dos cosas muy distintas, y conviene no confundirlas:
 *
 *   · **Lo que sí es cierto**, porque está en el ABC público de Migración
 *     Colombia: a quién hay que reportar, en qué momentos, y qué datos pide.
 *     Eso es lo que decide `quienNecesitaSire` y `loQueFaltaSire`, y es la
 *     parte que de verdad vale.
 *   · **Lo que es provisional**: el orden y la forma de las columnas del
 *     archivo. Va marcado como tal en todas partes y no se le llama «enviado»
 *     a nada.
 *
 * Cuando llegue el instructivo, lo que cambia es `lineaSire`. Lo demás ya está.
 */

/** Hasta que haya instructivo oficial, el archivo lleva esta marca dentro. */
export const SIRE_PROVISIONAL =
  "FORMATO PROVISIONAL: pendiente del instructivo oficial de Migracion Colombia";

export interface PersonaSire {
  nombres: string;
  apellidos: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  fechaNacimiento: string | null;
  /** ISO 3166-1 alfa-2. Es lo que decide si hay que reportar. */
  nacionalidad: string | null;
  /** Dónde se aloja en Colombia: la dirección del edificio. */
  direccionEnColombia: string;
}

export type Momento = "entrada" | "salida";

/**
 * Quién hay que reportar al SIRE, y por qué.
 *
 * Tres reglas, y las tres salen del ABC de Migración Colombia:
 *
 *   · solo **extranjeros**: un colombiano no se reporta;
 *   · solo si el alojamiento está **en Colombia**: el SIRE es colombiano, y
 *     este producto también opera en Perú;
 *   · y hace falta saber la nacionalidad. Si nadie la escribió, **no se
 *     adivina**: se dice que falta. Suponerla por el tipo de documento parece
 *     razonable y es falso —un colombiano puede entrar con pasaporte— y aquí
 *     equivocarse significa o no reportar a quien tocaba, o reportar a un
 *     nacional a Migración.
 */
export function quienNecesitaSire(
  personas: PersonaSire[],
  paisDelAlojamiento: string,
): { reportables: PersonaSire[]; sinNacionalidad: PersonaSire[] } {
  if (paisDelAlojamiento?.toUpperCase() !== "CO") {
    return { reportables: [], sinNacionalidad: [] };
  }

  const sinNacionalidad = personas.filter((p) => !p.nacionalidad?.trim());
  const reportables = personas.filter(
    (p) => p.nacionalidad?.trim() && p.nacionalidad.toUpperCase() !== "CO",
  );

  return { reportables, sinNacionalidad };
}

/**
 * Lo que falta para poder reportar a alguien.
 *
 * Los campos salen del ABC: tipo y número de documento, nombres y apellidos,
 * fecha de nacimiento, nacionalidad y dirección en Colombia.
 */
export function loQueFaltaSire(persona: PersonaSire): string[] {
  const faltan: string[] = [];

  if (!persona.nombres?.trim()) faltan.push("el nombre");
  if (!persona.apellidos?.trim()) faltan.push("los apellidos");
  if (!persona.tipoDocumento) faltan.push("el tipo de documento");
  if (!persona.documento?.trim()) faltan.push("el número de documento");
  if (!persona.fechaNacimiento) faltan.push("la fecha de nacimiento");
  if (!persona.nacionalidad?.trim()) faltan.push("la nacionalidad");

  return faltan;
}

/**
 * Una línea del archivo.
 *
 * **Esta es la parte provisional.** El separador y el orden son los que usan los
 * archivos planos de este tipo, pero no están confirmados contra el instructivo.
 * Cuando llegue, se cambia aquí y nada más: quién va en el archivo y con qué
 * datos ya está decidido arriba.
 */
export function lineaSire(persona: PersonaSire, momento: Momento, fecha: string): string {
  return [
    persona.tipoDocumento ?? "",
    persona.documento ?? "",
    persona.apellidos ?? "",
    persona.nombres,
    persona.fechaNacimiento ?? "",
    persona.nacionalidad ?? "",
    persona.direccionEnColombia,
    momento === "entrada" ? "I" : "S",
    fecha,
  ].join("|");
}

/** El archivo entero, con su cabecera de aviso. */
export function archivoSire(
  personas: PersonaSire[],
  momento: Momento,
  fecha: string,
): string {
  return [
    `# ${SIRE_PROVISIONAL}`,
    ...personas.map((p) => lineaSire(p, momento, fecha)),
  ].join("\n");
}
