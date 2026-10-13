import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import {
  activarSos,
  cerrarSos,
  type AlarmaActivada,
  type MotivoCierre,
} from "../services/sos.repo";

/**
 * La alarma se activa al entrar en la pantalla, no con un botón: cuando
 * alguien llega aquí ya pidió auxilio. Los dos botones de abajo la cierran.
 */
export function useSos() {
  const condominioId = useCondominioActivo() ?? "";
  // La vivienda desde la que se pide auxilio, si la persona tiene una. La
  // portería y la administración no la tienen, y la alarma vale igual.
  // La **elegida**, no la primera: con dos viviendas, al guardia le llegaba
  // «desde Torre X · Y» de la otra, que es justo adonde no hay que ir.
  const unidadId = useUnidadActiva()?.unidadId ?? null;
  const addToast = useUIStore((s) => s.addToast);
  const [alarma, setAlarma] = useState<AlarmaActivada | null>(null);

  const activar = useMutation({
    mutationFn: () => activarSos({ condominioId, unidadId }),
    onSuccess: setAlarma,
    onError: () =>
      addToast(
        "No se pudo avisar a la portería. Llama por teléfono.",
        "error",
      ),
  });

  const cerrar = useMutation({
    mutationFn: (motivo: MotivoCierre) =>
      alarma ? cerrarSos(alarma.id, motivo) : Promise.resolve(),
  });

  return {
    activar: activar.mutate,
    activando: activar.isPending,
    fallo: activar.isError,
    alarma,
    cerrar: cerrar.mutateAsync,
  };
}
