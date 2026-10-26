import { Platform } from "react-native";
import { supabase } from "./supabase";
import { ACTUALIZACION, VERSION } from "../version/version.generado";
import { mensajeDeError } from "../utils/error.util";
import { esperarComoMucho } from "../utils/comoMucho.util";

/**
 * Manda a la base un error de la app, o un paso de un flujo que se quiere
 * seguir (26/10/2026).
 *
 * Existe porque al escanear el documento la app se quedaba en blanco en el
 * celular del tester y no había forma de saber por qué: en un celular no hay
 * consola. Lo guardado lo mira el equipo con la clave de servicio; por la API
 * solo se puede escribir, y a nombre propio.
 *
 * Nunca lanza: informar de un fallo no puede causar otro. Sin sesión no se
 * manda nada (la política exige quién lo manda). Devuelve la promesa por si
 * hace falta esperarla (`anotarYEsperar`); casi siempre no se espera.
 */
export function anotarEnLaBase(
  tipo: "error" | "rastro",
  donde: string,
  mensaje: string,
  detalle?: string,
): Promise<void> {
  return (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const usuarioId = data.session?.user.id;
      if (!usuarioId) return;
      await supabase.from("error_de_la_app").insert({
        usuario_id: usuarioId,
        tipo,
        donde: donde.slice(0, 200),
        mensaje: (mensaje || "(sin mensaje)").slice(0, 2000),
        detalle: detalle?.slice(0, 8000) ?? null,
        version: `${VERSION} · actualización ${ACTUALIZACION}`,
        plataforma: Platform.OS,
      });
    } catch {
      // Sin red o sin base: se pierde, y no pasa nada más.
    }
  })();
}

/**
 * Anota un rastro y espera a que llegue a la base (como mucho `msMax`) antes
 * de seguir (26/10/2026). Para los pasos que pueden tumbar la app: si se
 * mandara sin esperar y la app muriera medio segundo después, el rastro se
 * perdería con ella y el registro diría que murió antes de lo que murió. Así
 * pasó con el escaneo del documento: solo llegaba «disparar».
 */
export async function anotarYEsperar(donde: string, mensaje: string, msMax = 2500): Promise<void> {
  await esperarComoMucho(anotarEnLaBase("rastro", donde, mensaje), msMax);
}

/** Un error cualquiera --un `Error`, un objeto de Supabase o un texto-- a mensaje y detalle. */
export function describirError(e: unknown): { mensaje: string; detalle?: string } {
  const mensaje = mensajeDeError(e, String(e));
  const pila = e && typeof e === "object" && "stack" in e ? String((e as { stack: unknown }).stack) : undefined;
  let crudo: string | undefined;
  try {
    crudo = JSON.stringify(e);
  } catch {
    crudo = undefined;
  }
  return { mensaje, detalle: pila ?? crudo };
}

export function anotarError(donde: string, e: unknown): void {
  const { mensaje, detalle } = describirError(e);
  anotarEnLaBase("error", donde, mensaje, detalle);
}
