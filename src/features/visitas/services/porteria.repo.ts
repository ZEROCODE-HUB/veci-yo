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

/**
 * La portería aprueba el documento a mano, sin que coincida (26/10/2026).
 *
 * El cliente: si lo escaneado no coincide, se puede volver a escanear o
 * aprobarlo a mano, con una advertencia, y queda quién lo aprobó. La base lo
 * deja verificado con `aprobado_a_mano` y el guardia en `verificado_por`.
 */
export async function aprobarDocumentoAMano(
  invitadoUuid: string,
  observaciones?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("aprobar_documento_a_mano", {
    p_invitado_id: invitadoUuid,
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

/**
 * La estancia de un QR de huésped (14/10/2026). Acepta el texto entero del QR
 * («VECIYO:ABC…») o solo el código tecleado. Solo responde a la portería del
 * edificio de esa estancia; a cualquier otro, `null`.
 */
export async function estanciaPorCodigo(textoDelQr: string): Promise<string | null> {
  const codigo = textoDelQr.trim().replace(/^VECIYO:/i, "").toUpperCase();
  if (!codigo) return null;
  const { data, error } = await supabase.rpc("estancia_por_codigo", { p_codigo: codigo });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Corrige la placa de un vehículo de la visita (14/10/2026). */
export async function cambiarPlaca(vehiculoUuid: string, placa: string): Promise<void> {
  const { error } = await supabase.rpc("cambiar_placa", {
    p_vehiculo_id: vehiculoUuid,
    p_placa: placa,
  });
  if (error) throw error;
}

/** Apunta el vehículo con el que llega una visita. */
export async function agregarVehiculoEnPorteria(
  visitaUuid: string,
  placa: string,
  tipo?: string,
): Promise<void> {
  const { error } = await supabase.rpc("agregar_vehiculo_en_porteria", {
    p_visita_id: visitaUuid,
    p_placa: placa,
    p_tipo: tipo || undefined,
  });
  if (error) throw error;
}

export type RevisionMenor = "se_parece" | "no_se_parece_seguro" | "no_se_parece_revisar";

/**
 * Lo que la portería anota al recibir a un menor de una estancia
 * (14/10/2026). Si duda, la base avisa al anfitrión.
 */
export async function anotarRevisionMenor(
  invitadoUuid: string,
  resultado: RevisionMenor,
  comentario?: string,
): Promise<void> {
  const { error } = await supabase.rpc("anotar_revision_menor", {
    p_invitado_id: invitadoUuid,
    p_resultado: resultado,
    p_comentario: comentario?.trim() || undefined,
  });
  if (error) throw error;
}
