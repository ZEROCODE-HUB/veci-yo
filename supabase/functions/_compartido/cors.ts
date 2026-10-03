/**
 * Las cabeceras que hacen falta para que el navegador pueda llamar.
 *
 * Sin esto, una función de Supabase **no se puede llamar desde una página web**,
 * y falla de la peor forma posible: el navegador manda primero un `OPTIONS`
 * --porque la petición lleva `Content-Type: application/json`, que no es de las
 * que se permiten sin preguntar-- la función responde «Método no permitido» sin
 * decir quién puede llamarla, y lo que llega al código es un escueto
 * `Failed to fetch`. Ni estado, ni cuerpo, ni motivo.
 *
 * Se descubrió el 03/10/2026 subiendo la autorización de un menor desde la
 * pantalla. Y al mirarlo apareció que `subir-documento-precheckin` tenía
 * exactamente el mismo agujero: la foto del documento del preregistro se dio
 * por resuelta el 02/10 --se escribió la función, se desplegó, se comprobó la
 * lógica-- y **nunca llegó a subirse desde el navegador**, que es el único
 * sitio desde el que alguien la sube.
 *
 * Es el defecto de siempre de este proyecto con otra cara: la pieza existe, es
 * correcta, y nadie pulsó el botón.
 *
 * `*` como origen es lo correcto aquí: estas dos funciones las llama gente **sin
 * sesión** --quien hace el preregistro todavía no es nadie en el sistema-- y la
 * credencial es el token del enlace, que se comprueba dentro. No hay cookie ni
 * cabecera de autorización que proteger, así que restringir el origen no añade
 * seguridad y sí rompe cada vez que cambia el dominio de despliegue.
 */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * La respuesta al `OPTIONS` previo, o `null` si no es esa petición.
 *
 * Se devuelve `204` y no `200`: no hay cuerpo que mandar, y algunos
 * intermediarios se quejan de un `200` sin contenido.
 */
export function responderPreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: CORS });
}
