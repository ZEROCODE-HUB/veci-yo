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
  // Se comprobaba solo que la cadena no estuviera vacia, y una de espacios es
  // "verdadera": el aviso rojo salia **en blanco**, que es lo que esta funcion
  // existe para evitar.
  const util = (valor: unknown) =>
    typeof valor === "string" && valor.trim() !== "";

  if (error instanceof Error && util(error.message)) return error.message;
  if (util(error)) return error as string;
  if (error && typeof error === "object") {
    const mensaje = (error as { message?: unknown }).message;
    if (util(mensaje)) return mensaje as string;
  }
  return porDefecto;
}
