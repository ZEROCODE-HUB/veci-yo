/**
 * Qué archivos se aceptan en cada sitio (29/10/2026).
 *
 * Manda la lista `archivo_formatos` de la base, que el administrador de la app
 * cambia en Panel › Más › Listas: los tipos (`tipos_mime`) y cómo se dicen
 * (`extensiones`). Lo que hay aquí es la lista de siempre y solo cuenta hasta
 * que llega la de la base, o si la base trae una fila que no se entiende.
 *
 * El tamaño no va aquí: es el ajuste `archivo_tamano_maximo_mb`, uno para
 * toda la app. Y la base no deja poner un tipo que el depósito de archivos no
 * acepte (`archivo_formato_cabe_en_el_bucket`): la subida fallaría con un
 * error del servidor en vez de con una frase que se entienda.
 */
export type SitioDeArchivo =
  | "foto_condominio"
  | "foto_zona"
  | "reglamento"
  | "documento_huesped"
  | "autorizacion_menor";

export interface FormatoDeArchivo {
  tiposMime: string[];
  extensiones: string;
}

const IMAGENES = ["image/jpeg", "image/png", "image/webp"];

export const FORMATOS_DE_RESPALDO: Record<SitioDeArchivo, FormatoDeArchivo> = {
  foto_condominio: { tiposMime: IMAGENES, extensiones: "JPG, PNG o WEBP" },
  foto_zona: { tiposMime: IMAGENES, extensiones: "JPG, PNG o WEBP" },
  reglamento: {
    tiposMime: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensiones: "PDF, DOC o DOCX",
  },
  documento_huesped: { tiposMime: IMAGENES, extensiones: "JPG, PNG o WEBP" },
  autorizacion_menor: {
    tiposMime: [...IMAGENES, "application/pdf"],
    extensiones: "JPG, PNG, WEBP o PDF",
  },
};

/** El formato de una fila de la lista, o el de respaldo si no se entiende. */
export function formatoDeLaFila(
  sitio: SitioDeArchivo,
  extra: Record<string, unknown> | undefined,
): FormatoDeArchivo {
  const respaldo = FORMATOS_DE_RESPALDO[sitio];
  const tipos = extra?.tipos_mime;
  const tiposMime =
    Array.isArray(tipos) && tipos.length > 0 && tipos.every((t) => typeof t === "string")
      ? (tipos as string[])
      : respaldo.tiposMime;
  const extensiones =
    typeof extra?.extensiones === "string" && extra.extensiones.trim()
      ? extra.extensiones.trim()
      : tiposMime === respaldo.tiposMime
        ? respaldo.extensiones
        : tiposMime.map((t) => t.split("/")[1]?.toUpperCase()).join(", ");
  return { tiposMime, extensiones };
}
