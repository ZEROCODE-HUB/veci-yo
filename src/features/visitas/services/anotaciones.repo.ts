import { supabase } from "@/shared/services/supabase";
import { formatDate, formatTime } from "@/shared/utils";

export interface AnotacionDeVisita {
  id: string;
  invitadoId: string | null;
  texto: string;
  /** Rutas en el bucket privado `visitas`. */
  archivos: string[];
  fecha: string;
  hora: string;
  autor: string | null;
}

/** La bitácora de la portería sobre una visita, de la más vieja a la más nueva. */
export async function obtenerAnotaciones(visitaUuid: string): Promise<AnotacionDeVisita[]> {
  const { data, error } = await supabase.rpc("anotaciones_de_la_visita", {
    p_visita_id: visitaUuid,
  });
  if (error) throw error;
  return (data ?? []).map((fila) => {
    const creada = new Date(fila.creada_en);
    return {
      id: fila.id,
      invitadoId: fila.invitado_id,
      texto: fila.texto ?? "",
      archivos: fila.archivos ?? [],
      fecha: formatDate(creada),
      hora: formatTime(creada),
      autor: fila.autor,
    };
  });
}

/**
 * Sube los archivos a la carpeta de la visita y deja la anotación. Quién y
 * cuándo los pone la base.
 */
export async function crearAnotacion(datos: {
  visitaUuid: string;
  invitadoUuid?: string | null;
  texto: string;
  uris: string[];
}) {
  const rutas: string[] = [];
  for (const uri of datos.uris) {
    // Los bytes, no el blob: en Android el blob llega como «text/plain».
    const archivo = await (await fetch(uri)).arrayBuffer();
    const ruta = `${datos.visitaUuid}/anotacion-${Date.now()}-${rutas.length}.jpg`;
    const { error } = await supabase.storage
      .from("visitas")
      .upload(ruta, archivo, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    rutas.push(ruta);
  }

  const { error } = await supabase.from("anotacion_visita").insert({
    visita_id: datos.visitaUuid,
    invitado_id: datos.invitadoUuid || null,
    texto: datos.texto.trim() || null,
    archivos: rutas,
  });
  if (error) throw error;
}
