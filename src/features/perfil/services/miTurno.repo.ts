import { supabase } from "@/shared/services/supabase";
import type { Turno } from "@/shared/types";

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : "");

/** El ajuste del horario de un día concreto. Sin horas: ese día no trabaja. */
export interface AjusteDeTurno {
  /** `yyyy-MM-dd`. */
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface MiPuestoDeGuardia {
  nombre: string;
  garita: string;
  turnos: Turno[];
  ajustes: AjusteDeTurno[];
}

/**
 * El puesto de guardia de quien tiene la sesión: su portería y su horario.
 *
 * La tarjeta «Mi turno» lo buscaba en un almacén en memoria **por el nombre
 * de pila**, con «Roberto Hornado» de respaldo: dos guardias con el mismo
 * nombre veían el turno del primero, y uno sin nombre en su perfil, el de esa
 * persona si existía (13/10/2026). Y ese almacén solo se llena en las
 * pantallas de la administración, así que al guardia casi nunca le llegaba
 * nada.
 *
 * Aquí se pide por lo que identifica a alguien: su cuenta. La política de
 * `turno_guardia` ya deja a cada uno leer los suyos.
 */
export async function obtenerMiPuestoDeGuardia(
  condominioId: string,
): Promise<MiPuestoDeGuardia | null> {
  const { data: sesion } = await supabase.auth.getUser();
  const usuarioId = sesion.user?.id;
  if (!usuarioId) return null;

  const { data, error } = await supabase
    .from("membresia_condominio")
    .select(
      `id, nombre,
       porteria:porteria_id ( nombre ),
       turnos:turno_guardia ( id, dia_semana, hora_inicio, hora_fin ),
       ajustes:turno_override ( fecha, hora_inicio, hora_fin )`,
    )
    .eq("condominio_id", condominioId)
    .eq("usuario_id", usuarioId)
    .eq("rol", "guardia")
    .eq("activo", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    nombre: data.nombre ?? "",
    garita: data.porteria?.nombre ?? "",
    turnos: (data.turnos ?? [])
      .slice()
      .sort((a, b) => a.dia_semana - b.dia_semana)
      .map((t) => ({
        uuid: t.id,
        dia: DIAS[t.dia_semana] ?? "",
        horaInicio: hhmm(t.hora_inicio),
        horaFin: hhmm(t.hora_fin),
      })),
    ajustes: (data.ajustes ?? []).map((a) => ({
      fecha: a.fecha,
      horaInicio: hhmm(a.hora_inicio),
      horaFin: hhmm(a.hora_fin),
    })),
  };
}

/**
 * Deja escrito que el turno de hoy terminó ahora. Devuelve la hora (`HH:mm`).
 *
 * El botón ponía una bandera en la memoria del teléfono y anunciaba «tus
 * privilegios de seguridad se han deshabilitado»: no se escribía nada. Ahora
 * queda como un ajuste del horario de hoy, que es lo que ve la administración.
 * **No quita permisos**: eso es otra decisión (REVISAR-A-OJO 196).
 */
export async function terminarMiTurno(condominioId: string): Promise<string> {
  const { data, error } = await supabase.rpc("terminar_mi_turno", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return hhmm(data as string | null);
}
