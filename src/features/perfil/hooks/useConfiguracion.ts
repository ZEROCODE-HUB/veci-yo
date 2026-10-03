import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import {
  guardarPreferencias,
  obtenerPreferencias,
  PREFERENCIAS_VACIAS,
  type Preferencias,
} from "../services/configuracion.repo";

/**
 * Lo que se le dice a la persona al guardar cada caja de texto.
 *
 * Solo las de texto: un interruptor cambia de aspecto al pulsarlo y eso ya
 * avisa. Una caja que guarda al salir del campo, no.
 */
const ETIQUETAS: Record<string, string> = {
  codigoPais: "Código del país",
  telefono: "Teléfono",
  telefonoAlt: "Teléfono alternativo",
  correoAlt: "Correo alternativo",
};

/**
 * Las preferencias de la persona.
 *
 * Salían de un store de Zustand sembrado con los datos de alguien inventado y
 * se perdían al cerrar la aplicación. Ahora son columnas de `perfil`.
 *
 * El formulario guarda al salir de cada campo, no con un botón: la pantalla no
 * tiene ninguno y añadirlo cambiaría cómo se usa. Los interruptores guardan al
 * cambiar, que es lo que la gente espera de un interruptor.
 */
export function useConfiguracion() {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["preferencias"],
    queryFn: obtenerPreferencias,
  });

  const [form, setForm] = useState<Preferencias>(PREFERENCIAS_VACIAS);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!data || cargado) return;
    setForm(data);
    setCargado(true);
  }, [data, cargado]);

  const guardar = useMutation({
    mutationFn: (cambios: Partial<Preferencias>) => guardarPreferencias(cambios),
    onSuccess: (_datos, cambios) => {
      queryClient.invalidateQueries({ queryKey: ["preferencias"] });
      /*
        Las cajas de texto guardan al salir del campo, sin boton, asi que si no
        dicen nada uno no sabe si quedo guardado. El alias --que esta tres
        lineas mas abajo en la misma pantalla-- si avisaba, y la diferencia se
        lee como que uno guarda y el otro no.

        Los interruptores no avisan: cambian de aspecto, y eso ya lo dice.
      */
      const etiqueta = ETIQUETAS[Object.keys(cambios)[0] ?? ""];
      if (etiqueta) addToast(`${etiqueta} guardado`, "success");
    },
    onError: (e: Error) =>
      addToast(
        /correo_alt_valido/.test(e?.message ?? "")
          ? "El correo alternativo no parece válido"
          : /contacto_alt_completo/.test(e?.message ?? "")
            ? "Indicá un teléfono o un correo alternativo"
            : "No se pudo guardar la preferencia",
        "error",
      ),
  });

  /** Escribe mientras se teclea; la base se entera al salir del campo. */
  const escribir = (cambios: Partial<Preferencias>) =>
    setForm((actual) => ({ ...actual, ...cambios }));

  /** Un interruptor no tiene "salir del campo": guarda al cambiar. */
  const cambiar = (cambios: Partial<Preferencias>) => {
    escribir(cambios);
    guardar.mutate(cambios);
  };

  return {
    preferencias: form,
    escribir,
    cambiar,
    /**
     * Para el `onBlur` de las cajas de texto.
     *
     * Sin tocar nada no se escribe: salir de un campo que no se cambio
     * disparaba una escritura y --ahora que avisa-- un «guardado» de algo que
     * nadie guardo.
     */
    /**
     * Guarda un campo al salir del foco.
     *
     * `valor` es opcional y existe para los campos que **no se teclean**: un
     * país se elige de una lista, así que no hay un «terminé de escribir», y
     * leerlo de `form` en el mismo tick devolvería el valor anterior —el estado
     * de React no se ha aplicado todavía—.
     */
    guardarCampo: (campo: keyof Preferencias, valor?: string) => {
      const nuevo = valor ?? form[campo];
      if (nuevo === data?.[campo]) return;
      guardar.mutate({ [campo]: nuevo } as Partial<Preferencias>);
    },
    guardando: guardar.isPending,
  };
}
