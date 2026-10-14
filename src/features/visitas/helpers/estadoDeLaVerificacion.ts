/**
 * En qué punto está la verificación de antecedentes de una persona.
 *
 * Desde el 14/10/2026 la consulta es real (Tus Datos) y corre sola al cerrar
 * el preregistro, así que hay más de dos estados. La responsable de producto
 * pidió que, con un hallazgo o con una incapacidad declarada, la estancia
 * «requiera aprobación manual» del anfitrión, que decide y se hace
 * responsable. Lo mismo cuando la consulta no se pudo hacer.
 *
 * Pura y aparte por lo de siempre: es una regla, y dentro del JSX nadie la
 * puede comprobar.
 */
export type EstadoVerificacion =
  /** Todavía no se ha consultado (se hace al cerrar el preregistro). */
  | "sin_iniciar"
  /** Lanzada; Tus Datos tarda alrededor de un minuto. */
  | "en_curso"
  | "aprobada"
  /** Hace falta que el anfitrión decida. */
  | "revision"
  /** El anfitrión la aprobó bajo su responsabilidad. */
  | "aprobada_manual"
  /** El anfitrión no la autorizó: la portería no la deja entrar. */
  | "rechazada";

export type MotivoDeRevision = "hallazgo" | "sin_consulta" | "incapacidad";

export interface DatosDeVerificacion {
  esMenor: boolean;
  /** `resultado` de `verificacion_antecedentes`, o null si no hay fila. */
  resultado: string | null;
  incapacidadDeclarada: boolean;
  revision: "aprobada" | "rechazada" | null;
}

export function motivoDeRevision(d: DatosDeVerificacion): MotivoDeRevision | null {
  if (d.esMenor) return null;
  if (d.resultado === "rechazada") return "hallazgo";
  if (d.incapacidadDeclarada) return "incapacidad";
  if (d.resultado === "error_proveedor") return "sin_consulta";
  return null;
}

export function estadoDeLaVerificacion(d: DatosDeVerificacion): EstadoVerificacion {
  if (motivoDeRevision(d)) {
    if (d.revision === "aprobada") return "aprobada_manual";
    if (d.revision === "rechazada") return "rechazada";
    return "revision";
  }
  if (d.resultado === "aprobada") return "aprobada";
  if (d.resultado === "pendiente") return "en_curso";
  return "sin_iniciar";
}

/** Si el paso del timeline cuenta como superado. */
export function verificacionSuperada(estado: EstadoVerificacion): boolean {
  return estado === "aprobada" || estado === "aprobada_manual";
}

export const TEXTO_DEL_MOTIVO: Record<MotivoDeRevision, string> = {
  hallazgo: "El informe trae hallazgos de nivel alto.",
  sin_consulta: "No se pudo hacer la consulta (fuentes caídas o la persona no la autoriza).",
  incapacidad: "El titular declaró que esta persona no puede hacer su registro.",
};
