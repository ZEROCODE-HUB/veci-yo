import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";
import { PAIS_POR_DEFECTO } from "@/shared/constants";

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
  /** País del teléfono alternativo (hueco 20: lo ve la portería). */
  codigoPaisAlt: string;
  telefonoAlt: string;
  correoAlt: string;
  modoDaltonico: boolean;
  fuenteAumentada: boolean;
  // Sin modo oscuro: «por ahora no va» (hueco 27, 21/10/2026).
  /** Interruptor general de los avisos push al celular (22/10/2026). */
  avisosPush: boolean;
  /**
   * Si le pueden sonar llamadas por la app (28/10/2026). Apagado, quien la
   * llama solo puede hacerlo por teléfono.
   */
  recibeLlamadasApp: boolean;
}

export const PREFERENCIAS_VACIAS: Preferencias = {
  telefono: "",
  codigoPais: PAIS_POR_DEFECTO,
  usarContactoAlt: false,
  codigoPaisAlt: PAIS_POR_DEFECTO,
  telefonoAlt: "",
  correoAlt: "",
  modoDaltonico: false,
  fuenteAumentada: false,
  avisosPush: true,
  recibeLlamadasApp: true,
};

export async function obtenerPreferencias(): Promise<Preferencias | null> {
  const { data: sesion } = await supabase.auth.getUser();
  const id = sesion.user?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from("perfil")
    .select(
      "telefono, codigo_pais, usar_contacto_alt, codigo_pais_alt, telefono_alt, correo_alt, modo_daltonico, fuente_aumentada, avisos_push, recibe_llamadas_app",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    telefono: data.telefono ?? "",
    codigoPais: data.codigo_pais ?? PAIS_POR_DEFECTO,
    usarContactoAlt: data.usar_contacto_alt ?? false,
    codigoPaisAlt: data.codigo_pais_alt ?? data.codigo_pais ?? PAIS_POR_DEFECTO,
    telefonoAlt: data.telefono_alt ?? "",
    correoAlt: data.correo_alt ?? "",
    modoDaltonico: data.modo_daltonico ?? false,
    fuenteAumentada: data.fuente_aumentada ?? false,
    avisosPush: data.avisos_push ?? true,
    recibeLlamadasApp: data.recibe_llamadas_app ?? true,
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
  if (cambios.codigoPaisAlt !== undefined) fila.codigo_pais_alt = vacioEsNulo(cambios.codigoPaisAlt);
  if (cambios.telefonoAlt !== undefined) fila.telefono_alt = vacioEsNulo(cambios.telefonoAlt);
  if (cambios.correoAlt !== undefined) fila.correo_alt = vacioEsNulo(cambios.correoAlt);
  if (cambios.modoDaltonico !== undefined) fila.modo_daltonico = cambios.modoDaltonico;
  if (cambios.fuenteAumentada !== undefined) fila.fuente_aumentada = cambios.fuenteAumentada;
  if (cambios.avisosPush !== undefined) fila.avisos_push = cambios.avisosPush;
  if (cambios.recibeLlamadasApp !== undefined) fila.recibe_llamadas_app = cambios.recibeLlamadasApp;

  if (Object.keys(fila).length === 0) return;

  const { data, error } = await supabase
    .from("perfil")
    .update(fila)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // Sin fila de perfil el `update` no toca nada y no se queja: se anunciaba
  // «guardado» de algo que no se guardó.
  if (!data?.length) {
    throw new Error("No encontramos tu perfil. Vuelve a entrar a la aplicación.");
  }
}
