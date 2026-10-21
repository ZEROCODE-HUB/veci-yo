/**
 * Que ninguna pantalla se quede trabajando con una sesión muerta.
 *
 * Una sesión puede anularse en el servidor mientras el teléfono sigue con su
 * permiso de acceso, que dura hasta una hora. Mientras tanto la base responde
 * --mira solo el permiso--, pero todo lo que pregunta «¿esta sesión sigue
 * viva?» falla: las funciones del servidor dicen «Sesión no válida». Pasó el
 * 21/10/2026 con el intercomunicador: el guardia contestaba y la llamada se
 * cortaba al primer segundo.
 *
 * Aquí viven las dos defensas, sin depender del dispositivo para poder
 * probarlas:
 *   · `fetchQueRenueva`: si una función responde 401, renueva la sesión y
 *     reintenta una vez; si no se puede renovar, la sesión está muerta.
 *   · `sesionMuerta`: el criterio para decidirlo al volver a la app.
 */

/** El motivo que se le dirá a la persona al sacarla, si la sacamos nosotros. */
let motivoDeSalida: string | null = null;

export const AVISO_SESION_MUERTA =
  "Tu sesión se cerró. Vuelve a entrar para seguir.";

export function marcarSalidaPorSesionMuerta() {
  motivoDeSalida = AVISO_SESION_MUERTA;
}

/** Lo lee una sola vez quien enseña el aviso al volver a la pantalla de entrada. */
export function tomarMotivoDeSalida(): string | null {
  const motivo = motivoDeSalida;
  motivoDeSalida = null;
  return motivo;
}

const direccion = (entrada: RequestInfo | URL): string =>
  typeof entrada === "string"
    ? entrada
    : entrada instanceof URL
      ? entrada.href
      : entrada.url;

/** Solo las funciones del servidor: la base y el acceso tienen su propio camino. */
export const esLlamadaAFuncion = (url: string) => url.includes("/functions/v1/");

/**
 * Un `fetch` para el cliente de Supabase que no se rinde al primer 401 de una
 * función: renueva la sesión y lo intenta otra vez con el permiso nuevo. Si la
 * sesión ya no se puede renovar, avisa con `alMorir` y devuelve el 401 tal
 * cual, para que la pantalla diga lo que pasó.
 */
export function fetchQueRenueva(
  base: typeof fetch,
  renovar: () => Promise<string | null>,
  alMorir: () => Promise<void>,
): typeof fetch {
  return async (entrada, opciones) => {
    const respuesta = await base(entrada, opciones);
    if (respuesta.status !== 401 || !esLlamadaAFuncion(direccion(entrada))) {
      return respuesta;
    }
    const permiso = await renovar().catch(() => null);
    if (!permiso) {
      await alMorir();
      return respuesta;
    }
    const cabeceras = new Headers(opciones?.headers);
    cabeceras.set("Authorization", `Bearer ${permiso}`);
    return base(entrada, { ...opciones, headers: cabeceras });
  };
}

/**
 * Si lo que respondió el servidor de acceso al preguntar por la sesión quiere
 * decir que está muerta. Solo un «no» del servidor cuenta: sin red no se saca a
 * nadie.
 *
 * El servidor dice 403 `session_not_found`, pero la librería de Supabase lo
 * convierte en `AuthSessionMissingError` (400) y de paso cierra la sesión ella
 * misma. Comprobado el 21/10/2026 con una cuenta temporal: se cuentan las tres
 * formas. Quien llama ya comprobó que había sesión antes de preguntar.
 */
export function sesionMuerta(
  error: { status?: number; code?: string; name?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.code === "session_not_found" ||
    error.name === "AuthSessionMissingError"
  );
}
