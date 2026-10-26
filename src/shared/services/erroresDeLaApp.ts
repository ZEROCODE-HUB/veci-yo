import { Platform } from "react-native";
import { supabase } from "./supabase";
import { ACTUALIZACION, VERSION } from "../version/version.generado";
import { mensajeDeError } from "../utils/error.util";

/**
 * Manda a la base un error de la app, o un paso de un flujo que se quiere
 * seguir (26/10/2026).
 *
 * Existe porque al escanear el documento la app se quedaba en blanco en el
 * celular del tester y no había forma de saber por qué: en un celular no hay
 * consola. Lo guardado lo mira el equipo con la clave de servicio; por la API
 * solo se puede escribir, y a nombre propio.
 *
 * Nunca lanza ni se espera: informar de un fallo no puede causar otro. Sin
 * sesión no se manda nada (la política exige quién lo manda).
 */
export function anotarEnLaBase(
  tipo: "error" | "rastro",
  donde: string,
  mensaje: string,
  detalle?: string,
): void {
  void (async () => {
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
