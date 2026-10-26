import { supabase } from "@/shared/services/supabase";

export interface ContactoDeLaVivienda {
  membresiaId: string;
  nombre: string;
  rol: string;
  esAnfitrionPrimario: boolean;
  esAdminPrimario: boolean;
  codigoPais: string | null;
  telefono: string | null;
  /** Acepta que lo contacten por WhatsApp (y tiene teléfono). */
  whatsapp: boolean;
  /** Acepta que le escriban por el chat. */
  chat: boolean;
  emergencia: { nombre: string | null; codigoPais: string | null; telefono: string } | null;
  /** Solo si la persona eligió usarlo, en Perfil › Configuración. */
  alterno: { codigoPais: string | null; telefono: string | null; correo: string | null } | null;
}

/**
 * Las personas de una vivienda con a quién llamar y por dónde (huecos 11 y
 * 20). Solo lo responde a la administración y a la portería del edificio: la
 * función lo comprueba antes de nada.
 */
export async function obtenerContactosDeLaVivienda(
  unidadId: string,
): Promise<ContactoDeLaVivienda[]> {
  const { data, error } = await supabase.rpc("contactos_de_la_vivienda", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    membresiaId: f.membresia_id,
    nombre: f.nombre ?? "",
    rol: f.rol,
    esAnfitrionPrimario: f.es_anfitrion_primario,
    esAdminPrimario: f.es_admin_primario,
    codigoPais: f.codigo_pais,
    telefono: f.telefono,
    whatsapp: f.whatsapp,
    chat: f.chat,
    emergencia: f.emergencia_telefono
      ? {
          nombre: f.emergencia_nombre,
          codigoPais: f.emergencia_codigo,
          telefono: f.emergencia_telefono,
        }
      : null,
    alterno:
      f.alterno_telefono || f.alterno_correo
        ? { codigoPais: f.alterno_codigo, telefono: f.alterno_telefono, correo: f.alterno_correo }
        : null,
  }));
}
