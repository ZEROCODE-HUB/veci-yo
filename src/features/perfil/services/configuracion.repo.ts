import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

/**
 * Las preferencias de la persona.
 *
 * Vivían en un store de Zustand y se perdían al cerrar la aplicación (R-29).
 * Dos de ellas no son una preferencia de pantalla sino **a dónde mandar las
 * notificaciones**: el día que se encienda el envío de correo, el servidor
 * tiene que saber a qué dirección escribir, y esa dirección solo existía en el
 * teléfono de quien la escribió.
 */

export interface Preferencias {
  telefono: string;
  codigoPais: string;
  usarContactoAlt: boolean;
  telefonoAlt: string;
  correoAlt: string;
  modoDaltonico: boolean;
  fuenteAumentada: boolean;
  modoOscuro: boolean;
}

export const PREFERENCIAS_VACIAS: Preferencias = {
  telefono: "",
  codigoPais: "",
  usarContactoAlt: false,
  telefonoAlt: "",
  correoAlt: "",
  modoDaltonico: false,
  fuenteAumentada: false,
  modoOscuro: false,
};

export async function obtenerPreferencias(): Promise<Preferencias | null> {
  const { data: sesion } = await supabase.auth.getUser();
  const id = sesion.user?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from("perfil")
    .select(
      "telefono, codigo_pais, usar_contacto_alt, telefono_alt, correo_alt, modo_daltonico, fuente_aumentada, modo_oscuro",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    telefono: data.telefono ?? "",
    codigoPais: data.codigo_pais ?? "",
    usarContactoAlt: data.usar_contacto_alt ?? false,
    telefonoAlt: data.telefono_alt ?? "",
    correoAlt: data.correo_alt ?? "",
    modoDaltonico: data.modo_daltonico ?? false,
    fuenteAumentada: data.fuente_aumentada ?? false,
    modoOscuro: data.modo_oscuro ?? false,
  };
}

export async function guardarPreferencias(
  cambios: Partial<Preferencias>,
): Promise<void> {
  const { data: sesion } = await supabase.auth.getUser();
  const id = sesion.user?.id;
  if (!id) throw new Error("No hay sesión activa");

  // Una cadena vacía es "no tengo", no "": la restricción del correo
  // alternativo rechaza cualquier cosa que no parezca un correo.
  const vacioEsNulo = (v?: string) => (v?.trim() ? v.trim() : null);

  type FilaPerfil = Database["public"]["Tables"]["perfil"]["Update"];
  const fila: FilaPerfil = {};
  if (cambios.telefono !== undefined) fila.telefono = vacioEsNulo(cambios.telefono);
  if (cambios.codigoPais !== undefined) fila.codigo_pais = vacioEsNulo(cambios.codigoPais);
  if (cambios.usarContactoAlt !== undefined) fila.usar_contacto_alt = cambios.usarContactoAlt;
  if (cambios.telefonoAlt !== undefined) fila.telefono_alt = vacioEsNulo(cambios.telefonoAlt);
  if (cambios.correoAlt !== undefined) fila.correo_alt = vacioEsNulo(cambios.correoAlt);
  if (cambios.modoDaltonico !== undefined) fila.modo_daltonico = cambios.modoDaltonico;
  if (cambios.fuenteAumentada !== undefined) fila.fuente_aumentada = cambios.fuenteAumentada;
  if (cambios.modoOscuro !== undefined) fila.modo_oscuro = cambios.modoOscuro;

  if (Object.keys(fila).length === 0) return;

  const { error } = await supabase.from("perfil").update(fila).eq("id", id);
  if (error) throw error;
}
