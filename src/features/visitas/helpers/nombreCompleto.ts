import type { VisitaItem } from "@/shared/types";

/**
 * El nombre completo del titular de una visita o reserva: nombre y apellidos
 * (09/11/2026, Correcciones fila 24: «en las cards de Reservas, poner el
 * nombre completo»). `item.nombre` es solo el nombre del primer invitado.
 */
export function nombreCompletoDeLaVisita(item: Pick<VisitaItem, "nombre" | "invitados">): string {
  const titular = item.invitados?.[0];
  return [titular?.nombre ?? item.nombre, titular?.apellidos ?? ""].join(" ").replace(/\s+/g, " ").trim();
}
