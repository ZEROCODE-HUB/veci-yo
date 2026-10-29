import { supabase } from "@/shared/services/supabase";
import { comprobarFormato, comprobarTamano, segundosDeEnlace, tipoDeArchivo } from "@/shared/services/archivos";
import type { Database } from "@/shared/types/database.types";
import { paisPorDefecto, paisPorCodigo } from "@/shared/constants/paises";

/**
 * Los contactos del edificio y su foto (16/10/2026).
 *
 * La maqueta de Arquitectura → Condominio pedía el equipo administrativo y las
 * empresas de seguridad y limpieza, y se habían quitado porque no tenían dónde
 * guardarse. Los carga la administración y los ven los miembros del edificio en
 * Perfil → Soporte → Contacto.
 */

export type TipoContacto =
  Database["public"]["Enums"]["tipo_contacto_condominio"];

export interface ContactoDelCondominio {
  id: string;
  tipo: TipoContacto;
  nombre: string;
  cargo: string;
  telefono: string;
  codigoPais: string;
  correo: string;
}

/** «+57 3105551001», o el número solo si no tiene país. */
export function telefonoParaMostrar(
  c: Pick<ContactoDelCondominio, "telefono" | "codigoPais">,
) {
  if (!c.telefono) return "";
  const pais = paisPorCodigo(c.codigoPais);
  return pais ? `+${pais.prefijo} ${c.telefono}` : c.telefono;
}

// Los cargos del equipo: lista `cargos_equipo_admin` de la base (`useLista`).

const SELECT_CONTACTO =
  "id, tipo, nombre, cargo, telefono, codigo_pais, correo" as const;

export async function obtenerContactosDelCondominio(
  condominioId: string,
): Promise<ContactoDelCondominio[]> {
  const { data, error } = await supabase
    .from("contacto_condominio")
    .select(SELECT_CONTACTO)
    .eq("condominio_id", condominioId)
    .is("deleted_at", null)
    .order("orden")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    id: fila.id,
    tipo: fila.tipo,
    nombre: fila.nombre,
    cargo: fila.cargo ?? "",
    telefono: fila.telefono ?? "",
    codigoPais: fila.codigo_pais ?? paisPorDefecto(),
    correo: fila.correo ?? "",
  }));
}

/** Da de alta (sin `id`) o corrige un contacto. Columna a columna. */
export async function guardarContactoDelCondominio(
  condominioId: string,
  contacto: Omit<ContactoDelCondominio, "id"> & { id?: string },
): Promise<void> {
  const fila = {
    tipo: contacto.tipo,
    nombre: contacto.nombre.trim(),
    cargo: contacto.cargo.trim() || null,
    telefono: contacto.telefono.trim() || null,
    codigo_pais: contacto.telefono.trim() ? contacto.codigoPais || null : null,
    correo: contacto.correo.trim() || null,
  };
  const { error } = contacto.id
    ? await supabase
        .from("contacto_condominio")
        .update(fila)
        .eq("id", contacto.id)
    : await supabase
        .from("contacto_condominio")
        .insert({ ...fila, condominio_id: condominioId });
  if (error) throw error;
}

/** Quitarlo lo marca: no se borra nada. */
export async function retirarContactoDelCondominio(id: string): Promise<void> {
  const { error } = await supabase
    .from("contacto_condominio")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** El enlace temporal de la foto del condominio, o `null` si no tiene. */
export async function urlFotoDelCondominio(
  condominioId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("condominio")
    .select("foto_path")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.foto_path) return null;
  const { data: firmada, error: errorFirma } = await supabase.storage
    .from("condominios")
    .createSignedUrl(data.foto_path, await segundosDeEnlace());
  if (errorFirma) throw errorFirma;
  return firmada.signedUrl;
}

/**
 * Sube la foto elegida (un uri del dispositivo) y la deja puesta. Con la hora
 * en el nombre, para que no se quede la vieja en la caché del navegador.
 */
export async function subirFotoDelCondominio(
  condominioId: string,
  uri: string,
): Promise<void> {
  const archivo = await (await fetch(uri)).blob();
  // En el celular el blob llega a veces sin tipo o como «image/jpg»: se
  // deduce y se normaliza (29/10/2026, Para Claude fila 141).
  const tipo = tipoDeArchivo(archivo.type, uri);
  // Los tipos, de la lista `archivo_formatos` (29/10/2026).
  await comprobarFormato("foto_condominio", tipo, "La foto");
  // El tope de la plataforma; aquí había un 5 propio (25/10/2026).
  await comprobarTamano(archivo.size);
  const ruta = `${condominioId}/foto-${Date.now()}.${tipo.split("/")[1]}`;
  const { error } = await supabase.storage
    .from("condominios")
    .upload(ruta, archivo, { contentType: tipo, upsert: true });
  if (error) throw error;
  const { error: errorFila } = await supabase
    .from("condominio")
    .update({ foto_path: ruta })
    .eq("id", condominioId);
  if (errorFila) throw errorFila;
}
