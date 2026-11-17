/**
 * Cómo se presenta el archivo de un reglamento (17/11/2026).
 *
 * En el depósito el archivo se guarda con un nombre generado --para que dos
 * «reglamento.pdf» no se pisen--, así que lo que la gente reconoce es el
 * nombre con que se subió (`reglamento.archivo_nombre`). Los subidos antes de
 * guardarlo no lo tienen: entonces se dice qué es, «Reglamento (PDF)», en vez
 * de enseñar una cadena aleatoria.
 *
 * Puro, sin la plataforma: lo usan la pantalla y el que abre el archivo, y se
 * prueba sin montar nada.
 */

export type ClaseDeDocumento = "pdf" | "word" | "otro";

export interface TipoDeDocumento {
  clase: ClaseDeDocumento;
  /** «PDF», «Word» o «Documento»: lo que se le dice a la persona. */
  etiqueta: string;
  /** Para que el celular ofrezca las aplicaciones que saben abrirlo. */
  mime: string;
  /** El equivalente de iOS. */
  uti: string;
  extension: string;
}

const PDF: TipoDeDocumento = {
  clase: "pdf",
  etiqueta: "PDF",
  mime: "application/pdf",
  uti: "com.adobe.pdf",
  extension: ".pdf",
};

const WORD_NUEVO: TipoDeDocumento = {
  clase: "word",
  etiqueta: "Word",
  mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  uti: "org.openxmlformats.wordprocessingml.document",
  extension: ".docx",
};

const WORD_VIEJO: TipoDeDocumento = {
  clase: "word",
  etiqueta: "Word",
  mime: "application/msword",
  uti: "com.microsoft.word.doc",
  extension: ".doc",
};

const OTRO: TipoDeDocumento = {
  clase: "otro",
  etiqueta: "Documento",
  mime: "application/octet-stream",
  uti: "public.data",
  extension: "",
};

/** Qué es el archivo, por su extensión (la ruta del depósito la conserva). */
export function tipoDeDocumento(nombreORuta: string): TipoDeDocumento {
  const limpio = nombreORuta.split("?")[0].toLowerCase();
  if (limpio.endsWith(".pdf")) return PDF;
  if (limpio.endsWith(".docx")) return WORD_NUEVO;
  if (limpio.endsWith(".doc")) return WORD_VIEJO;
  return OTRO;
}

/** El nombre que se enseña: el de la subida o, si no se guardó, qué es. */
export function nombreVisibleDelReglamento(ruta: string, nombre?: string | null): string {
  const delUsuario = (nombre ?? "").trim();
  if (delUsuario) return delUsuario;
  const tipo = tipoDeDocumento(ruta);
  return tipo.clase === "otro" ? "Reglamento" : `Reglamento (${tipo.etiqueta})`;
}

/**
 * Un nombre de archivo que se puede escribir en la caché del celular: sin
 * barras ni caracteres que un sistema de archivos rechace, y con la
 * extensión correcta para que lo abra la aplicación que toca.
 */
export function nombreParaGuardar(ruta: string, nombre?: string | null): string {
  const tipo = tipoDeDocumento(ruta);
  const base = nombreVisibleDelReglamento(ruta, nombre)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Reglamento";
  const sinExtension = base.replace(/\.(pdf|docx?)$/i, "").trim() || "Reglamento";
  return `${sinExtension}${tipo.extension}`;
}
