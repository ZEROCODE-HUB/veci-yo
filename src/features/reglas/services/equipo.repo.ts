import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

type RolCondominio = Database["public"]["Enums"]["rol_condominio"];

export interface MiembroDelEquipo {
  membresiaId: string;
  usuarioId: string | null;
  rol: RolCondominio;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  codigoPais: string | null;
  permisos: Record<string, unknown>;
  /** Los turnos de un guardia, ya escritos: «Lun 06:00–13:00 · Mar ...». */
  horario: string | null;
  /** Solo de un guardia: si está trabajando ahora. */
  deTurno: boolean;
  recibeLlamadas: boolean;
  recibeChat: boolean;
}

/**
 * Administradores, coadministradores y guardias del edificio (Para Claude 190
 * y 191, 30/10/2026). Solo la administración: la base lo comprueba.
 */
export async function obtenerEquipoDelEdificio(
  condominioId: string,
): Promise<MiembroDelEquipo[]> {
  const { data, error } = await supabase.rpc("equipo_del_edificio", {
    p_condominio_id: condominioId,
  });
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    membresiaId: fila.membresia_id,
    usuarioId: fila.usuario_id,
    rol: fila.rol,
    nombre: fila.nombre,
    correo: fila.correo,
    telefono: fila.telefono,
    codigoPais: fila.codigo_pais,
    permisos:
      fila.permisos && typeof fila.permisos === "object" && !Array.isArray(fila.permisos)
        ? (fila.permisos as Record<string, unknown>)
        : {},
    horario: fila.horario,
    deTurno: Boolean(fila.de_turno),
    recibeLlamadas: Boolean(fila.recibe_llamadas),
    recibeChat: Boolean(fila.recibe_chat),
  }));
}
