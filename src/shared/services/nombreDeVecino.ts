/**
 * Como se nombra a una persona del condominio: su nombre y su depto, juntos.
 *
 * Lo pidio el cliente el 02/10/2026 --«el TAG del depto junto al rol»-- y al
 * preguntarle en que pantalla, respondio lo que en realidad queria: «va
 * siempre, casi en todo lado donde salga el nombre o el alias».
 *
 * Tiene sentido: en un edificio la gente se conoce por el depto antes que por
 * el apellido, y el alias --que se puede encender en el cuadro de honor y en
 * las zonas-- sin nada al lado no identifica a nadie.
 *
 * Vive aqui por la misma razon que `nombreDeVivienda`: cada pantalla que se
 * arma el texto por su cuenta lo arma distinto. El chat ya escribia
 * «Seguridad · Dpto 301» y los resultados de una votacion pintaban «301» a
 * secas, sin nombre.
 *
 * Para el **texto** --una ficha, una fila de una lista-- se usa esta funcion.
 * Donde hay sitio para una etiqueta aparte, `EtiquetaVivienda`.
 */
export function nombreDeVecino(
  nombre: string,
  /** El codigo de la unidad. Vacio o null para quien no vive aqui. */
  unidad?: string | null,
): string {
  const quien = nombre?.trim() ?? "";
  const donde = unidad?.trim() ?? "";

  /*
    Sin depto se devuelve el nombre y nada mas. Es el caso de la
    administracion y de la porteria, que no viven en el edificio: inventarles
    un «sin depto» seria ruido en cada mensaje que escriben.
  */
  if (!donde) return quien;

  // Y sin nombre, el depto solo. Pasa en la lista de quien no voto, que sale
  // del censo de unidades.
  if (!quien) return donde;

  return `${quien} · ${donde}`;
}
