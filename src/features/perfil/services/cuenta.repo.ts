import { supabase } from "@/shared/services/supabase";

/**
 * Elimina la cuenta de quien la llama.
 *
 * Hasta el 13/10/2026 el botón pedía el motivo y una confirmación para
 * responder «todavía no está disponible». Ahora lo hace la base
 * (`eliminar_mi_cuenta`): da de baja las membresías, deja una línea de
 * constancia sin datos personales y borra la cuenta. Lo que es constancia de
 * algo que pasó --una visita registrada, un paquete recibido-- se queda, sin
 * su nombre.
 *
 * La base no deja irse a la única administración de un edificio ni a un
 * anfitrión con estancias abiertas, y dice por qué.
 */
export async function eliminarMiCuenta(motivo: string): Promise<void> {
  const { error } = await supabase.rpc("eliminar_mi_cuenta", {
    p_motivo: motivo.trim() || undefined,
  });
  if (error) throw error;
}
