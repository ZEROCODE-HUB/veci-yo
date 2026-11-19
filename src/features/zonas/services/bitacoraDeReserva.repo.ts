import { supabase } from "@/shared/services/supabase";
import { desdeLaBase } from "@/shared/utils";

/** Una línea del historial de una reserva (18/11/2026). */
export interface AccionDeReserva {
  id: string;
  accion: string;
  cuando: Date;
  /** Nombre de quien la hizo; null si fue la base (la cancelación automática). */
  quien: string | null;
  /** «10:00 → 11:00», «2 → 3 personas»: lo que cambió, si se puede decir corto. */
  cambio: string | null;
}

type Datos = Record<string, string | number | null> | null;

function cambioDe(antes: Datos, despues: Datos): string | null {
  if (!antes || !despues) return null;
  const partes: string[] = [];
  const hora = (d: Datos) => `${String(d?.hora_inicio ?? "").slice(0, 5)}–${String(d?.hora_fin ?? "").slice(0, 5)}`;
  if (antes.fecha !== despues.fecha) partes.push(`${antes.fecha} → ${despues.fecha}`);
  if (hora(antes) !== hora(despues)) partes.push(`${hora(antes)} → ${hora(despues)}`);
  if (antes.acompanantes !== despues.acompanantes) {
    partes.push(`${Number(antes.acompanantes ?? 0) + 1} → ${Number(despues.acompanantes ?? 0) + 1} personas`);
  }
  return partes.length ? partes.join(", ") : null;
}

export async function accionesDeReserva(reservaId: string): Promise<AccionDeReserva[]> {
  const { data, error } = await supabase
    .from("reserva_zona_accion")
    .select("id, accion, hecha_por, antes, despues, created_at")
    .eq("reserva_id", reservaId)
    .order("created_at");
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((f) => f.hecha_por).filter((v): v is string => Boolean(v)))];
  const nombres = new Map<string, string>();
  if (ids.length) {
    const { data: perfiles, error: errorPerfiles } = await supabase
      .from("perfil")
      .select("id, nombre, apellido")
      .in("id", ids);
    if (errorPerfiles) throw errorPerfiles;
    for (const p of perfiles ?? []) nombres.set(p.id, [p.nombre, p.apellido].filter(Boolean).join(" "));
  }
  return (data ?? []).map((f) => ({
    id: f.id,
    accion: f.accion,
    cuando: desdeLaBase(f.created_at),
    quien: f.hecha_por ? (nombres.get(f.hecha_por) ?? "Alguien") : null,
    cambio: cambioDe(f.antes as Datos, f.despues as Datos),
  }));
}
