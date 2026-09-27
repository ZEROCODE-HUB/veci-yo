/**
 * El mensaje de un error, sea lo que sea lo que llegó.
 *
 * En JavaScript se puede lanzar cualquier cosa —una cadena, un objeto, `null`—,
 * así que el valor de un `catch` es `unknown`. Se escribía `catch (e: any)` y
 * `e?.message`, que compila y devuelve `undefined` cuando lo lanzado no es un
 * `Error`: el aviso sale en blanco justo cuando algo ha fallado de forma
 * inesperada, que es cuando más falta hace leerlo.
 *
 * Supabase devuelve objetos con `message` que no son instancias de `Error`, así
 * que mirar solo `instanceof` tampoco basta.
 */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const mensaje = (error as { message?: unknown }).message;
    if (typeof mensaje === "string" && mensaje) return mensaje;
  }
  return porDefecto;
}
