import { supabase } from "@/shared/services/supabase";
import type { Actualizacion } from "@/shared/types";
import { crearInvitacion } from "@/shared/services/invitaciones";
import type { Coadministrador } from "@/shared/types";
import { PAIS_POR_DEFECTO } from "@/shared/constants";

/**
 * Coadministradores del condominio.
 *
 * Dar de alta uno NO es un insert: necesita una cuenta para iniciar sesión, así
 * que es una invitación por correo. La lista mezcla dos cosas que el prototipo
 * confundía en una sola fila con un campo `estado`:
 *
 *   - quienes ya aceptaron y son miembros → `membresia_condominio`
 *   - quienes fueron invitados y no aceptaron todavía → `invitacion` pendiente
 *
 * Distinguirlas importa: a un miembro se le editan permisos, a un invitado solo
 * se le puede revocar la invitación.
 */

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export async function obtenerCoadministradores(
  condominioId: string,
): Promise<Coadministrador[]> {
  const [miembros, invitaciones] = await Promise.all([
    supabase
      .from("membresia_condominio")
      .select("id, nombre, telefono, codigo_pais, documento, permisos, activo")
      .eq("condominio_id", condominioId)
      .eq("rol", "coadministrador")
      .eq("activo", true),
    supabase
      .from("invitacion")
      .select("id, nombre, correo, expira_en")
      .eq("condominio_id", condominioId)
      .eq("ambito", "condominio")
      .eq("rol_condominio", "coadministrador")
      .eq("estado", "pendiente"),
  ]);

  if (miembros.error) throw miembros.error;
  if (invitaciones.error) throw invitaciones.error;

  const activos: Coadministrador[] = (miembros.data ?? []).map((m) => ({
    uuid: m.id,
    id: idNumerico(m.id),
    nombre: m.nombre ?? "Sin nombre",
    correo: "",
    celular: m.telefono ?? "",
    codigoPais: m.codigo_pais ?? PAIS_POR_DEFECTO,
    unidadId: 0,
    estado: "aceptado",
    fechaInvitacion: "",
    permisos: (m.permisos as Record<string, boolean>) ?? {},
    esInvitacion: false,
  })) as unknown as Coadministrador[];

  const pendientes: Coadministrador[] = (invitaciones.data ?? []).map((i) => ({
    uuid: i.id,
    id: idNumerico(i.id),
    nombre: i.nombre,
    correo: i.correo,
    celular: "",
    codigoPais: PAIS_POR_DEFECTO,
    unidadId: 0,
    estado: "pendiente",
    fechaInvitacion: i.expira_en,
    permisos: {},
    esInvitacion: true,
  })) as unknown as Coadministrador[];

  return [...activos, ...pendientes];
}

export interface NuevoCoadministrador {
  condominioId: string;
  nombre: string;
  apellido?: string;
  correo: string;
  celular?: string;
  /** ISO 3166-1 alfa-2 del celular. */
  codigoPais?: string;
  permisos?: Record<string, boolean>;
}

/**
 * Emite la invitación.
 *
 * El nombre y el celular **viajan con ella** desde el 05/10/2026, y la base los
 * copia a la membresía al aceptarse. Antes el celular se perdía --la invitación
 * no tenía columna para el teléfono de quien se invita, solo para el de su
 * contacto de emergencia-- y el nombre también, pero solo en esta rama: la
 * membresía del condominio se creaba sin él y la lista enseñaba «Sin nombre».
 *
 * Los **permisos** siguen sin guardarse: se aplican editando, cuando ya hay
 * membresía sobre la que ponerlos. Está en REVISAR-A-OJO.
 */
export async function invitarCoadministrador(datos: NuevoCoadministrador) {
  return crearInvitacion({
    ambito: "condominio",
    condominioId: datos.condominioId,
    rol: "coadministrador",
    correo: datos.correo,
    nombre: `${datos.nombre} ${datos.apellido ?? ""}`.trim(),
    telefono: datos.celular,
    codigoPais: datos.codigoPais,
  });
}

export async function actualizarCoadministrador(
  membresiaUuid: string,
  datos: {
    nombre?: string;
    celular?: string;
    /**
     * El país del celular. `membresia_condominio.codigo_pais` existe desde el
     * primer día y **nadie la escribía**: el número quedaba como texto suelto,
     * así que no se podía marcar ni mandar un WhatsApp sin adivinar el país.
     */
    codigoPais?: string;
    permisos?: Record<string, boolean>;
  },
) {
  const cambios: Actualizacion<"membresia_condominio"> = {};
  if (datos.nombre !== undefined) cambios.nombre = datos.nombre;
  if (datos.celular !== undefined) cambios.telefono = datos.celular;
  if (datos.codigoPais !== undefined) cambios.codigo_pais = datos.codigoPais || null;
  if (datos.permisos !== undefined) cambios.permisos = datos.permisos;

  const { error } = await supabase
    .from("membresia_condominio")
    .update(cambios)
    .eq("id", membresiaUuid);
  if (error) throw error;
}

/** Quita el rol. Si todavia era una invitacion, la revoca. */
export async function quitarCoadministrador(
  uuid: string,
  esInvitacion: boolean,
) {
  if (esInvitacion) {
    const { error } = await supabase
      .from("invitacion")
      .update({ estado: "revocada" })
      .eq("id", uuid);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("membresia_condominio")
    .update({ activo: false })
    .eq("id", uuid);
  if (error) throw error;
}
