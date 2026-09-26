import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
/*
  Import estatico, no `await import("xlsx")`: el dinamico no lo resolvia el
  empaquetador y la pantalla se quedaba en «Creando el archivo...» para
  siempre, sin error visible. Cuesta tamaño de bundle; costaba mas un boton
  que no termina nunca.
*/
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import { supabase } from "@/shared/services/supabase";
import { hojaDeReporte, nombreDeArchivo } from "./reporteAExcel";
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
 * La exportación a Excel está en `reporteAArchivo`, al final. El envío
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

/**
 * El reporte, como archivo de Excel.
 *
 * La pantalla decía cuántos registros había y ahí se acababa: ninguna forma de
 * leerlos (R-33). El texto lo atribuía al proveedor de correo, y ahí había dos
 * cosas mezcladas — un archivo se genera sin depender de nadie.
 *
 * Devuelve dónde quedó el archivo. En móvil se guarda y se ofrece compartir;
 * en web se descarga, que es lo que allí significa «guardar».
 */
export async function reporteAArchivo(
  solicitud: SolicitudReporte,
  resultado: ResultadoReporte,
): Promise<{ nombre: string; compartido: boolean }> {
  const { filas, anchos } = hojaDeReporte(
    resultado.columnas,
    resultado.filas,
  );
  const nombre = nombreDeArchivo(
    solicitud.reporteId,
    solicitud.todoHistorial ? null : solicitud.desde,
    solicitud.todoHistorial ? null : solicitud.hasta,
  );

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja["!cols"] = anchos.map((ancho) => ({ wch: ancho }));
  // La fila de encabezados se queda fija al desplazarse: un reporte de
  // trescientas filas sin esto obliga a subir para saber qué columna es cuál.
  hoja["!freeze"] = { xSplit: "0", ySplit: "1" };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Reporte");

  if (Platform.OS === "web") {
    /*
      La descarga a mano, no `XLSX.writeFile`: esa function busca el sistema de
      archivos de Node y en el navegador no hace nada --se quedaba colgada--.
      Un Blob y un enlace es lo que de verdad descarga un archivo en web.
    */
    const datos = XLSX.write(libro, { type: "array", bookType: "xlsx" });
    const blob = new Blob([datos], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    // Se suelta el objeto: sin esto el archivo se queda en memoria hasta que
    // se cierre la pestaña, y un reporte grande no es pequeño.
    URL.revokeObjectURL(url);
    return { nombre, compartido: false };
  }

  /*
    Los bytes directos, no base64: `expo-file-system` 57 estrenó una API nueva
    --`File` y `Paths`-- y su `write` acepta un `Uint8Array`. La API vieja
    --`cacheDirectory`, `writeAsStringAsync`-- sigue existiendo bajo
    `expo-file-system/legacy`, pero escribir bytes por una cadena base64 es
    una vuelta de más para un archivo que ya son bytes.
  */
  const bytes = XLSX.write(libro, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;

  const archivo = new File(Paths.cache, nombre);
  if (archivo.exists) archivo.delete();
  archivo.create();
  archivo.write(new Uint8Array(bytes));
  const destino = archivo.uri;

  /*
    Se guarda en la cache y se ofrece compartir, en vez de dejarlo en un sitio
    fijo: en iOS no hay «carpeta de descargas» a la que el usuario llegue solo,
    y compartir es el camino por el que el archivo acaba donde él quiera
    --correo, Drive, Archivos--.
  */
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destino, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Guardar o enviar el reporte",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
    return { nombre, compartido: true };
  }

  return { nombre, compartido: false };
}
