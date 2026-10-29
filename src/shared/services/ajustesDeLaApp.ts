// Por el alias y no con ruta relativa: las pruebas de recorrido sustituyen
// ese módulo por un cliente sin React Native, y un `./supabase` se les escapa.
import { obtenerParametrosPublicos } from "@/shared/services/parametros.repo";
import { parametroBooleano, parametroTexto, type MapaDeParametros } from "./parametros";

/**
 * Los ajustes que deciden cómo sale algo de la app (28/10/2026): si las
 * invitaciones van por correo, a qué web apuntan los enlaces, si la TRA sale
 * de verdad y dónde se paga la suscripción.
 *
 * Eran variables `EXPO_PUBLIC_*`, o sea que cambiarlas era volver a publicar
 * la app. Ahora son ajustes de `configuracion_plataforma` que el administrador
 * de la app cambia en Panel › Ajustes, con confirmación.
 *
 * Para el código que no es una pantalla (los servicios que arman un enlace).
 * Una pantalla usa `useParametrosDeLaBase`, que es lo mismo con React Query.
 */

const VIGENCIA_MS = 5 * 60 * 1000;
let leidos: { cuando: number; mapa: Promise<MapaDeParametros> } | null = null;

function ajustes(): Promise<MapaDeParametros> {
  if (!leidos || Date.now() - leidos.cuando > VIGENCIA_MS) {
    const mapa = obtenerParametrosPublicos().catch((e: unknown) => {
      leidos = null;
      throw e;
    });
    leidos = { cuando: Date.now(), mapa };
  }
  return leidos.mapa;
}

/** Tras cambiar un ajuste desde el panel, para no esperar a que caduque. */
export function olvidarAjustesDeLaApp() {
  leidos = null;
}

/** La web de Veciyo, sin la barra final: la raíz de todo enlace que sale. */
export async function webDeVeciyo(): Promise<string> {
  return parametroTexto(await ajustes(), "url_web").replace(/\/+$/, "");
}

/**
 * Si las invitaciones y el preregistro salen por correo.
 *
 * `EXPO_PUBLIC_INVITACIONES_EMAIL=false` lo **apaga** en local: el recorrido
 * en el navegador y las pruebas necesitan el enlace en pantalla, y la base es
 * la de producción. Solo puede apagar; encender lo decide el ajuste.
 */
export function correoApagadoEnEsteEquipo(): boolean {
  return process.env.EXPO_PUBLIC_INVITACIONES_EMAIL === "false";
}

export async function invitacionesPorCorreo(): Promise<boolean> {
  if (correoApagadoEnEsteEquipo()) return false;
  return parametroBooleano(await ajustes(), "invitaciones_por_correo");
}
