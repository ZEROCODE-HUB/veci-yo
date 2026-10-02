import {
  esDeLaMaquina,
  traducirRestriccion,
} from "./restriccionesDeLaBase";

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

  const crudo =
    error instanceof Error && util(error.message)
      ? error.message
      : util(error)
        ? (error as string)
        : error && typeof error === "object" && util((error as { message?: unknown }).message)
          ? ((error as { message: string }).message)
          : null;

  if (crudo === null) return porDefecto;

  /*
    Postgres responde a una restriccion violada con una frase suya: «new row
    for relation "reserva_zona" violates check constraint
    "reserva_zona_horario_coherente"». En ingles, nombrando una tabla, y sin
    decir que hacer.

    Antes daba igual porque esta funcion no llegaba a usarse en casi ningun
    sitio y se mostraba un generico. Al conectarla --que era lo correcto para
    los disparadores, que si escriben frases para leerse-- estas quedaron a la
    vista: una mejora destapo el agujero de al lado.

    Lo conocido se traduce; lo que no, se calla. Vale mas «no se pudo guardar»
    que enseñar el nombre de una tabla.
  */
  if (esDeLaMaquina(crudo)) return traducirRestriccion(crudo) ?? porDefecto;

  return crudo;
}
