import { supabase } from "@/shared/services/supabase";
import type { AjusteDelDia, TurnoSemanal } from "../helpers/turnoDelPersonal";

/**
 * La gente de la portería a la que se puede escribir (17/11/2026).
 *
 * Sale de `personal_de_porteria`: solo quien tiene el chat habilitado --los
 * demás no leen el chat de la portería--, con su cargo, si está de turno ahora
 * con el reloj del edificio, y su horario para escribir «Entra mañana 7:00».
 */
export interface PersonalDePorteria {
  membresiaId: string;
  nombre: string;
  /** Código de la lista `cargos_de_porteria` (seguridad, conserje…). */
  cargo: string;
  /** Lo que se lee: «Seguridad», «Conserje». */
  cargoEtiqueta: string;
  /** Lo decide la base. Sin horario cargado, `true`. */
  deTurno: boolean;
  tieneHorario: boolean;
  turnos: TurnoSemanal[];
  ajustes: AjusteDelDia[];
  /** Hora de pared del edificio, «YYYY-MM-DDTHH:MM:SS». */
  ahoraLocal: string;
}

function lista<T>(valor: unknown): T[] {
  return Array.isArray(valor) ? (valor as T[]) : [];
}

export async function obtenerPersonalDePorteria(
  condominioId: string,
): Promise<PersonalDePorteria[]> {
  const { data, error } = await supabase.rpc("personal_de_porteria", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    membresiaId: fila.membresia_id,
    nombre: fila.nombre,
    cargo: fila.cargo,
    cargoEtiqueta: fila.cargo_etiqueta,
    deTurno: fila.de_turno,
    tieneHorario: fila.tiene_horario,
    turnos: lista<TurnoSemanal>(fila.turnos),
    ajustes: lista<AjusteDelDia>(fila.ajustes),
    ahoraLocal: fila.ahora_local,
  }));
}
