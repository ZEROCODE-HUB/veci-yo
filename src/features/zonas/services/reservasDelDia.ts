import type { ReservaZona } from "@/shared/types";
import { ocupaLaFranja } from "./puestosDeLaZona";

/**
 * Las reservas de un día en una zona, en orden de hora (15/10/2026).
 *
 * Es lo que ve la portería al entrar a una zona común. Hasta hoy veía la misma
 * grilla para reservar que un vecino, y el cliente lo dijo claro: «el guardia
 * debería ver las reservas, actualmente le sale para reservar». Las canceladas
 * y rechazadas no ocupan la zona, así que no salen.
 */
export function reservasDelDia(
  reservas: ReservaZona[],
  /** El día, tal como lo trae cada reserva en `fecha` (dd/MM/yyyy). */
  fecha: string,
): ReservaZona[] {
  const inicio = (horario: string) => {
    const m = horario.match(/(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : Number.MAX_SAFE_INTEGER;
  };
  return reservas
    .filter((r) => r.fecha === fecha && ocupaLaFranja(r.estado))
    .sort((a, b) => inicio(a.horario) - inicio(b.horario));
}
