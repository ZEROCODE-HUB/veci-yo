import type { RolActivo } from "@/shared/types";
import { almacenamientoLocal } from "./supabase";

/*
  El último rol con el que entró cada persona en este dispositivo (Para Claude
  174, 30/10/2026): se entra directo con él, sin la pantalla de elegir rol. No
  es un permiso --el rol activo es un contexto de trabajo, regla 8--, así que
  si ya no lo tiene se entra con el primero que tenga.
*/
const clave = (usuarioId: string) => `veciyo.rol.${usuarioId}`;

export async function leerRolRecordado(usuarioId: string): Promise<RolActivo | null> {
  try {
    return ((await almacenamientoLocal.getItem(clave(usuarioId))) as RolActivo | null) ?? null;
  } catch {
    return null;
  }
}

export async function recordarRol(usuarioId: string, rol: RolActivo) {
  if (!rol) return;
  try {
    await almacenamientoLocal.setItem(clave(usuarioId), rol);
  } catch {
    // Si no se puede recordar, la próxima vez entra con el primero: no pasa nada.
  }
}
