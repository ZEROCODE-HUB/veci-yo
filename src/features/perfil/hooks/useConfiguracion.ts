import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils/error.util";
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
    onError: (e: Error, cambios) => {
      /*
        Lo que no se guardó vuelve a como estaba. El interruptor se pintaba
        primero y se escribía después, sin deshacer: quedaba encendido en
        pantalla y apagado en la base.
      */
      if (data) {
        setForm((actual) => {
          const restaurado = { ...actual };
          for (const campo of Object.keys(cambios) as (keyof Preferencias)[]) {
            (restaurado[campo] as Preferencias[typeof campo]) = data[campo];
          }
          return restaurado;
        });
      }
      addToast(
        /correo_alt_valido/.test(e?.message ?? "")
          ? "El correo alternativo no parece válido"
          : /contacto_alt_completo/.test(e?.message ?? "")
            ? "Indica un teléfono o un correo alternativo"
            : mensajeDeError(e, "No se pudo guardar la preferencia"),
        "error",
      );
    },
  });

  /** Escribe mientras se teclea; la base se entera al salir del campo. */
  const escribir = (cambios: Partial<Preferencias>) =>
    setForm((actual) => ({ ...actual, ...cambios }));

  /** Un interruptor no tiene "salir del campo": guarda al cambiar. */
  const cambiar = (cambios: Partial<Preferencias>) => {
    escribir(cambios);
    guardar.mutate(cambios);
  };

  /*
    «¿Recibir notificaciones en datos alternativos?»

    La base no deja encenderlo sin un teléfono o un correo alternativo, y los
    dos campos solo aparecen **con el interruptor encendido**: la primera vez
    siempre fallaba. Salía «indica un teléfono…», los campos aparecían, se
    llenaban, decían «guardado»… y el interruptor seguía apagado en la base,
    porque al guardar el campo no viajaba él (13/10/2026).

    Ahora encender sin datos solo abre los campos, y el interruptor se guarda
    **junto con el primer dato alternativo**.
  */
  const cambiarContactoAlt = (encendido: boolean) => {
    const hayDatos = Boolean(form.telefonoAlt.trim() || form.correoAlt.trim());
    if (encendido && !hayDatos) {
      escribir({ usarContactoAlt: true });
      return;
    }
    cambiar({ usarContactoAlt: encendido });
  };

  /** Por qué ese valor no se puede guardar, o cadena vacía. */
  const errorDe = (campo: keyof Preferencias, valor: string): string => {
    const limpio = valor.trim();
    if (limpio === "") return "";
    if (campo === "telefono" || campo === "telefonoAlt") {
      const cifras = limpio.replace(/\D/g, "");
      return cifras.length >= 7 && cifras.length <= 15
        ? ""
        : "Revisa el teléfono: tiene que tener entre 7 y 15 cifras.";
    }
    if (campo === "correoAlt") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)
        ? ""
        : "El correo alternativo no parece válido.";
    }
    return "";
  };

  return {
    preferencias: form,
    escribir,
    cambiar,
    cambiarContactoAlt,
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
      if (typeof nuevo === "string") {
        const error = errorDe(campo, nuevo);
        if (error) {
          addToast(error, "error");
          return;
        }
      }
      const cambios = { [campo]: nuevo } as Partial<Preferencias>;
      // El interruptor viaja con el primer dato alternativo que se escribe.
      if (
        (campo === "telefonoAlt" || campo === "correoAlt") &&
        form.usarContactoAlt &&
        !data?.usarContactoAlt &&
        typeof nuevo === "string" &&
        nuevo.trim()
      ) {
        cambios.usarContactoAlt = true;
      }
      guardar.mutate(cambios);
    },
    guardando: guardar.isPending,
  };
}
