/*
  Import estatico, no `await import("xlsx")`: el dinamico no lo resolvia el
  empaquetador y la pantalla se quedaba en «Creando el archivo...» para
  siempre, sin error visible. Cuesta tamaño de bundle; costaba mas un boton
  que no termina nunca.
*/
import { supabase } from "@/shared/services/supabase";
import type { Database } from "@/shared/types/database.types";

type TipoReporteDB = Database["public"]["Enums"]["tipo_reporte"];

/**
 * Reportes del administrador.
 *
 * El prototipo "generaba" el reporte con un setTimeout de dos segundos que
 * devolvía los mismos parámetros que había recibido: no consultaba nada.
 *
 * Aquí cada tipo tiene su consulta, y la solicitud queda registrada porque un
 * reporte lleva datos personales de los residentes —quién entró, a qué hora, a
 * qué unidad— y quien lo pide debe quedar asentado.
 *
 * La exportación a Excel está en `reporteArchivo.ts`, aparte: escribir el
 * archivo depende de la plataforma y este módulo tiene que poder cargarse
 * desde Node, donde corren los recorridos. El envío
 * automático mensual sigue pendiente: ese sí necesita el transporte de correo,
 * que no tiene proveedor contratado. Eran dos cosas distintas y la pantalla
 * las daba por la misma (R-33).
 */

const FUNCION: Record<string, string> = {
  visitantes: "reporte_visitantes",
  correspondencia: "reporte_correspondencia",
  "areas-comunes": "reporte_areas_comunes",
};

const TIPO_DB: Record<string, TipoReporteDB> = {
  visitantes: "visitantes",
  correspondencia: "correspondencia",
  "areas-comunes": "areas_comunes",
};

export interface SolicitudReporte {
  condominioId: string;
  reporteId: string;
  desde?: string; // yyyy-MM-dd
  hasta?: string;
  todoHistorial: boolean;
}

export interface ResultadoReporte {
  filas: Record<string, unknown>[];
  columnas: string[];
  total: number;
}

export async function generarReporte(
  solicitud: SolicitudReporte,
): Promise<ResultadoReporte> {
  const funcion = FUNCION[solicitud.reporteId];
  if (!funcion) throw new Error("Tipo de reporte desconocido");

  const desde = solicitud.todoHistorial ? null : solicitud.desde || null;
  const hasta = solicitud.todoHistorial ? null : solicitud.hasta || null;

  const { data, error } = await supabase.rpc(funcion as never, {
    p_condominio_id: solicitud.condominioId,
    p_desde: desde,
    p_hasta: hasta,
  } as never);

  if (error) throw error;

  const filas = (data ?? []) as Record<string, unknown>[];

  // La solicitud se registra SIEMPRE, haya o no resultados: lo que se audita
  // es el acceso a los datos, no el volumen.
  const { error: errorRegistro } = await supabase
    .from("solicitud_reporte")
    .insert({
      condominio_id: solicitud.condominioId,
      tipo: TIPO_DB[solicitud.reporteId],
      desde,
      hasta,
      todo_historial: solicitud.todoHistorial,
      filas: filas.length,
    });
  if (errorRegistro) throw errorRegistro;

  return {
    filas,
    columnas: filas.length > 0 ? Object.keys(filas[0]) : [],
    total: filas.length,
  };
}

export interface SolicitudRegistrada {
  id: string;
  tipo: string;
  desde: string | null;
  hasta: string | null;
  todoHistorial: boolean;
  filas: number | null;
  solicitadaEn: string;
  /** Quien lo pidio. `undefined` si esa persona ya no esta en el condominio. */
  solicitadaPor?: string;
}

/**
 * Historial de quien pidio que reporte.
 *
 * El nombre se pide en la misma consulta a traves de
 * `solicitud_reporte_solicitada_por_perfil_fkey`: sin esa clave declarada,
 * PostgREST no sabe llegar de `auth.users` a `perfil` y responde 400, que es
 * como se quedaba vacia la bandeja de correspondencia.
 */
export async function obtenerSolicitudes(
  condominioId: string,
): Promise<SolicitudRegistrada[]> {
  const { data, error } = await supabase
    .from("solicitud_reporte")
    .select(
      `id, tipo, desde, hasta, todo_historial, filas, created_at,
       solicitada_por:perfil!solicitud_reporte_solicitada_por_perfil_fkey ( nombre, apellido )`,
    )
    .eq("condominio_id", condominioId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data ?? []).map((fila: any) => {
    const p = Array.isArray(fila.solicitada_por)
      ? fila.solicitada_por[0]
      : fila.solicitada_por;
    return {
      id: fila.id,
      tipo: fila.tipo,
      desde: fila.desde,
      hasta: fila.hasta,
      todoHistorial: fila.todo_historial,
      filas: fila.filas,
      solicitadaEn: fila.created_at,
      solicitadaPor: p
        ? [p.nombre, p.apellido].filter(Boolean).join(" ")
        : undefined,
    };
  });
}
