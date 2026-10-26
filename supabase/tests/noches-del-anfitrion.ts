import { createClient } from "@supabase/supabase-js";
import { CLAVE_SERVICIO, URL } from "./apoyo";

/**
 * Las noches de la 102 y la 205, abiertas mientras corre la suite.
 *
 * Desde el 26/10/2026 la base hace respetar las noches mínimas y máximas del
 * anfitrión (huecos 10 y 28). Una veintena de recorridos abren en esas dos
 * viviendas estancias de una o dos noches --«esta noche», «la de mañana»--, y
 * quien prueba la app a mano puede dejar la 102 pidiendo tres.
 *
 * Así que al empezar se apuntan las noches que tienen, se dejan en «desde una
 * noche, sin máximo», y al terminar se devuelven tal cual. Lo que comprueba la
 * regla lo hace `la-estancia-respeta-al-anfitrion` en una vivienda propia,
 * para no pisar a nadie.
 */
const VIVIENDAS = ["44444444-4444-4444-4444-444444444443", "44444444-4444-4444-4444-444444444442"];

export default async function () {
  const servicio = createClient(URL, CLAVE_SERVICIO, { auth: { persistSession: false } });
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("unidad_id, estancia_minima_noches, estancia_maxima_noches")
    .in("unidad_id", VIVIENDAS);
  if (error) throw new Error(`No se pudieron leer las noches: ${error.message}`);
  const antes = data ?? [];

  const { error: e2 } = await servicio
    .from("suscripcion_renta_corta")
    .update({ estancia_minima_noches: 1, estancia_maxima_noches: null })
    .in("unidad_id", VIVIENDAS);
  if (e2) throw new Error(`No se pudieron abrir las noches: ${e2.message}`);

  return async () => {
    for (const fila of antes) {
      await servicio
        .from("suscripcion_renta_corta")
        .update({ estancia_minima_noches: fila.estancia_minima_noches, estancia_maxima_noches: fila.estancia_maxima_noches })
        .eq("unidad_id", fila.unidad_id);
    }
  };
}
