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

/*
  Aqui estaban `SolicitudRegistrada` y `obtenerSolicitudes`, el historial de
  quien pidio que reporte. Ninguna pantalla lo mostraba: `npm run sueltas` la
  daba como funcion de datos sin usar desde el principio.

  Decision del cliente del 29/09/2026: se quita. La tabla `solicitud_reporte`
  **sigue registrando** cada reporte que se genera --eso lo hace la base, no
  esta funcion-- asi que la constancia no se pierde; lo que se va es el codigo
  que nadie llamaba. Punto 65 de `REVISAR-A-OJO.md`.
*/
