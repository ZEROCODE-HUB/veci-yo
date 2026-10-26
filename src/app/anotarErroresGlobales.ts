import { anotarError } from "@/shared/services/erroresDeLaApp";

/**
 * Los errores que no pasan por ninguna pantalla --un botón que lanza, una
 * promesa sin `catch`-- también se anotan en la base (26/10/2026). En el
 * celular un error fatal cierra la app o la deja en blanco, y sin esto no
 * queda ni el mensaje. Después se le pasa al manejador de siempre, que sigue
 * decidiendo qué hacer.
 *
 * En web no hay `ErrorUtils`; ahí el navegador ya tiene su consola.
 */
export function anotarErroresGlobales(): void {
  const utils = (globalThis as { ErrorUtils?: typeof ErrorUtils }).ErrorUtils;
  if (!utils) return;
  const anterior = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    anotarError(fatal ? "global (fatal)" : "global", error);
    anterior(error, fatal);
  });
}
