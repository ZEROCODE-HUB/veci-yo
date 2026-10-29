import { useMemo } from "react";
import { useLista } from "@/shared/hooks/useLista";

/**
 * Los oficios que se ofrecen al registrar un profesional (29/10/2026).
 *
 * Estaban escritos en `visitas/constants.ts`; ahora son la lista
 * `oficios_de_profesionales`, que el administrador de la app renombra, ordena,
 * oculta y amplía en Panel › Más › Listas. Cada opción dice en `extra.tipo` si
 * es de un profesional permanente o temporal; una sin tipo vale para los dos
 * (es lo que trae una opción recién agregada).
 *
 * Se guarda el nombre, no el código: la columna es texto libre y el historial
 * de visitas tiene que seguir leyéndose si la opción se renombra después.
 * «Otros» es el que abre el campo para escribir la profesión, y se reconoce
 * por el código (`…_otros`), que no cambia aunque cambie el nombre.
 */
export function useOficios(tipo: string | null) {
  const { opciones } = useLista("oficios_de_profesionales");
  return useMemo(() => {
    const delTipo = opciones.filter((o) => !o.extra.tipo || o.extra.tipo === tipo);
    const otros = new Set(delTipo.filter((o) => o.codigo.endsWith("otros")).map((o) => o.etiqueta));
    return {
      oficios: delTipo.map((o) => o.etiqueta),
      esOtro: (profesion: string) => otros.has(profesion),
    };
  }, [opciones, tipo]);
}
