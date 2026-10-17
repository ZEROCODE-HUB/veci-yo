import { formatDate } from "@/shared/utils/date.util";

export function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

// `filtrarPersonas`, `getAvatarEmoji`, `TORRES_FILTER_OPTIONS` y
// `DEPTOS_FILTER_OPTIONS` se fueron con los mocks: las personas y las unidades
// salen de la base, y el emoji lo decide el tipo de conversacion en
// `chat.repo.ts`.

/**
 * El nombre de un día para separar la conversación: «Hoy», «Ayer» o la fecha.
 * Recibe la fecha ya formateada (`dd/MM/yyyy`), que es como viaja el mensaje.
 */
export function nombreDelDia(fecha: string, hoy: Date = new Date()): string {
  if (!fecha) return "";
  if (fecha === formatDate(hoy)) return "Hoy";
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha === formatDate(ayer)) return "Ayer";
  return fecha;
}

/**
 * Cuándo fue el último mensaje, para la lista: la hora si fue hoy, «Ayer», o
 * la fecha. La lista decía «24/09/2026 00:06» en cada fila, que se lee peor y
 * no cabe en un teléfono.
 */
export function cuandoFue(fecha: string, hora: string, hoy: Date = new Date()): string {
  const dia = nombreDelDia(fecha, hoy);
  return dia === "Hoy" ? hora : dia;
}
