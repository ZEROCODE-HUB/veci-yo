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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["preferencias"] }),
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
    /** Para el `onBlur` de las cajas de texto. */
    guardarCampo: (campo: keyof Preferencias) =>
      guardar.mutate({ [campo]: form[campo] } as Partial<Preferencias>),
    guardando: guardar.isPending,
  };
}
