import { supabase } from "@/shared/services/supabase";
import type { DepartamentoRentaCorta } from "../types/reglas";

/**
 * Unidades habilitadas para renta corta.
 *
 * Venían de tres departamentos inventados con la misma responsable repetida y
 * tres teléfonos peruanos fijos. Salen de `unidades_renta_corta`, que junta la
 * suscripción con quién responde por la unidad y decide en la base si los
 * teléfonos se devuelven o no (migración 20260922130000).
 */
export async function obtenerUnidadesRentaCorta(params: {
  condominioId: string;
  /**
   * Si se consulta con rol de administración o portería. Lo decide el rol
   * activo, no la identidad: quien administra el condominio y ademas vive en
   * él no debe ver los contactos de sus vecinos mientras opera como
   * propietario (regla 8 de AGENTS.md). Pedirlo en `true` no da privilegios
   * que no se tengan: la función lo sigue comprobando.
   */
  comoPersonal: boolean;
}): Promise<DepartamentoRentaCorta[]> {
  const { data, error } = await supabase.rpc("unidades_renta_corta", {
    p_condominio_id: params.condominioId,
    p_como_personal: params.comoPersonal,
  });

  if (error) throw error;

  return (data ?? []).map((fila: any) => ({
    id: fila.unidad_id,
    // La base devuelve el código en null cuando la unidad pidió ocultarlo a
    // los demás residentes; la tarjeta ya sabía mostrar "(oculto)".
    ocultarNumero: fila.codigo === null,
    departamento: fila.codigo ? `Dpto ${fila.codigo}` : "Departamento (oculto)",
    torre: `Torre ${fila.torre_numero}`,
    piso: String(fila.piso ?? ""),
    // El "responsable" de la tarjeta es el anfitrión: quien recibe huéspedes.
    responsable: fila.anfitrion ?? fila.propietario ?? "Sin asignar",
    estado: fila.estado,
    administrador: fila.administrador ?? "",
    anfitrion: fila.anfitrion ?? "",
    propietario: fila.propietario ?? "",
    // Si la unidad pidió ocultar el contacto, la base devuelve null y el botón
    // de llamar no aparece: antes existía la bandera y no la miraba nadie.
    telAdmin: fila.administrador_tel ?? undefined,
    telAnfitrion: fila.anfitrion_tel ?? undefined,
    telPropietario: fila.propietario_tel ?? undefined,
    mascotas: fila.permite_mascotas,
    cumplimiento: {
      antirruido: fila.tiene_antirruido,
      noFumar: fila.tiene_no_fumar,
      sensor: fila.tiene_sensor,
    },
    verificadaEn: fila.verificada_en,
  }));
}
