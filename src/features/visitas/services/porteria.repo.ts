import { supabase } from "@/shared/services/supabase";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";

/**
 * La portería teclea el número del documento que le enseñan en la puerta.
 *
 * Devuelve si **coincide** con el que el huésped escribió en su preregistro, y
 * eso lo decide la base, no esta función ni la pantalla: compara los dos
 * números sin puntos, guiones ni mayúsculas, y deja anotado quién lo comprobó
 * y cuándo.
 *
 * Lo decidió el cliente el 09/10/2026: «coincide» es número contra número. La
 * foto que toma el guardia es constancia, no se compara con nada.
 *
 * Falla --no devuelve `false`-- si esa persona no está en la lista de la
 * portería (no es de hoy ni de mañana ni está dentro) o si no escribió su
 * documento: en los dos casos no hay nada que comparar.
 */
export async function verificarEnPorteria(
  invitadoUuid: string,
  numeroVisto: string,
  observaciones?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("anotar_verificacion_en_porteria", {
    p_invitado_id: invitadoUuid,
    p_numero_visto: numeroVisto,
    p_observaciones: observaciones,
  });
  if (error) throw error;
  return data === true;
}

/** Una franja del gráfico de la portería: cuántos, no quiénes. */
export interface FranjaDeTrafico {
  movimiento: "ingreso" | "salida";
  /** La hora del día, de 0 a 23, con el reloj del edificio. */
  hora: number;
  esHuesped: boolean;
  personas: number;
  conVehiculo: number;
}

/**
 * Cuánta gente entra y sale por hora en un día.
 *
 * La lista de la portería solo trae hoy, mañana y a quien está dentro; el
 * gráfico mira también ayer. Por eso esto devuelve **números y no personas**:
 * se puede pedir cualquier día sin enseñar a nadie.
 */
export async function obtenerTraficoDePorteria(
  condominioId: string,
  dia: string,
): Promise<FranjaDeTrafico[]> {
  const { data, error } = await supabase.rpc("trafico_de_porteria", {
    p_condominio_id: condominioId,
    p_dia: dia,
  });
  if (error) throw error;
  return (data ?? []).map((fila) => ({
    movimiento: fila.movimiento === "salida" ? "salida" : "ingreso",
    hora: fila.hora,
    esHuesped: fila.es_huesped,
    personas: fila.personas,
    conVehiculo: fila.con_vehiculo,
  }));
}

/**
 * Guarda la foto que la portería tomó del documento que le enseñan.
 *
 * No sube al almacenamiento directamente: pasa por una función de servidor
 * que le pone la **marca de agua** —quién, dónde y cuándo— y guarda esa, no
 * la que llega. Una marca que pusiera el teléfono sería una marca que el
 * teléfono puede no poner.
 *
 * Recibe la imagen ya en base64: leerla del dispositivo es cosa de la
 * plataforma y vive en `porteriaArchivo.ts`.
 */
export async function subirFotoDePorteria(
  invitadoUuid: string,
  imagenBase64: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "subir-documento-porteria",
    { body: { invitadoId: invitadoUuid, imagenBase64 } },
  );
  if (error) {
    // El cuerpo es donde la función dice por qué; `invoke` lo tira si no es 2xx.
    const motivo = await motivoDeLaFuncion(error);
    throw motivo ? new Error(motivo) : error;
  }
  return (data as { ruta: string }).ruta;
}
