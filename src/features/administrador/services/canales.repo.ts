import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];
type RolCondominio = Database["public"]["Enums"]["rol_condominio"];

/**
 * Los canales del chat del edificio.
 *
 * Hasta el 05/10/2026 no había canales: había **dos grupos fijos**, y lo eran
 * en tres sitios a la vez --un enum de dos valores, un índice único por
 * `(condominio, ámbito)`, y la pertenencia escrita dentro de una función--.
 * Cambiar los roles de un grupo era escribir una migración.
 *
 * El cliente lo pidió el 02/10/2026: «canales creados al dar de alta el
 * edificio, con nombre y roles, editables». Ahora los roles viven en
 * `canal_rol` y el alta del edificio deja los dos de siempre puestos.
 *
 * La pertenencia **no se guarda**: se deduce del rol. Así el residente «entra
 * automáticamente al crearse» --lo otro que pidió-- sin que haya que escribir
 * una fila por persona y por canal cada vez que alguien entra, cambia de rol o
 * se va, que son tres sitios donde olvidarse.
 */

/** Los roles que se pueden marcar, con su nombre en la pantalla. */
export const ROLES_DE_VIVIENDA: { clave: RolUnidad; etiqueta: string }[] = [
  { clave: "propietario", etiqueta: "Propietarios" },
  { clave: "inquilino_lider", etiqueta: "Inquilinos líderes" },
  { clave: "residente", etiqueta: "Residentes" },
  { clave: "corresidente", etiqueta: "Corresidentes" },
  { clave: "coadministrador", etiqueta: "Coadministradores de vivienda" },
  /*
    El huésped temporal se puede marcar, y por defecto no lo está: antes la
    función lo excluía a mano --`m.rol <> 'huesped_temporal'`, porque está de
    paso-- y ahora es, sencillamente, un rol que no viene en la lista del canal.
    Que un edificio quiera meterlo en un canal de avisos es asunto suyo.
  */
  { clave: "huesped_temporal", etiqueta: "Huéspedes temporales" },
];

export const ROLES_DE_EDIFICIO: { clave: RolCondominio; etiqueta: string }[] = [
  { clave: "administrador", etiqueta: "Administración" },
  { clave: "coadministrador", etiqueta: "Coadministración" },
  { clave: "guardia", etiqueta: "Portería" },
];

export interface Canal {
  id: string;
  nombre: string;
  rolesVivienda: RolUnidad[];
  rolesEdificio: RolCondominio[];
  /** A cuántas personas alcanza. Marcar roles sin ver esto es marcar a ciegas. */
  personas: number;
  archivado: boolean;
}

export async function obtenerCanales(condominioId: string): Promise<Canal[]> {
  const { data, error } = await supabase.rpc("canales_del_condominio", {
    p_condominio_id: condominioId,
  });

  if (error) throw error;

  return (data ?? []).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre ?? "",
    rolesVivienda: fila.roles_unidad ?? [],
    rolesEdificio: fila.roles_condominio ?? [],
    personas: fila.personas ?? 0,
    archivado: fila.archivado ?? false,
  }));
}

/**
 * Crea o reescribe un canal.
 *
 * Los roles se **reemplazan**, no se acumulan: lo que llega es la lista que se
 * ve marcada en la pantalla. Y va en una sola llamada porque hacerlo en dos
 * --crear la conversación, luego los roles-- dejaría, si falla la segunda, un
 * canal sin nadie dentro: uno que ni se puede ver para arreglarlo.
 */
export async function guardarCanal(params: {
  condominioId: string;
  nombre: string;
  rolesVivienda: RolUnidad[];
  rolesEdificio: RolCondominio[];
  /** Vacío para uno nuevo. */
  canalId?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("guardar_canal", {
    p_condominio_id: params.condominioId,
    p_nombre: params.nombre,
    p_roles_unidad: params.rolesVivienda,
    p_roles_condominio: params.rolesEdificio,
    p_conversacion_id: params.canalId ?? undefined,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Retira un canal de la lista, o lo devuelve.
 *
 * No se borra: `mensaje` cuelga de `conversacion` con cascade, así que borrar
 * un canal se llevaría por delante todo lo que se dijo en él. Un canal creado
 * por error no puede costar el historial de otro.
 */
export async function archivarCanal(params: {
  canalId: string;
  archivar: boolean;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc("archivar_canal", {
    p_conversacion_id: params.canalId,
    p_archivar: params.archivar,
  });

  if (error) throw error;
  return data ?? params.archivar;
}
