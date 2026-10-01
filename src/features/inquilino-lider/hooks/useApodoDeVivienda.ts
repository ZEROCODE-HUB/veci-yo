import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import { ponerApodoAVivienda } from "../services";
import type { Ubicacion } from "@/shared/types";

/**
 * Ponerle nombre a una vivienda, y que se vea al momento.
 *
 * Al guardar se vuelve a pedir el contexto de sesión en vez de tocar el almacén
 * a mano: la lista de viviendas la arma `sesion.ts` desde la base, y escribirla
 * por los dos lados es cómo se acaba con dos versiones del mismo dato.
 */
export function useApodoDeVivienda() {
  const sincronizar = useAuthStore((estado) => estado.sincronizarContexto);
  const addToast = useUIStore((estado) => estado.addToast);
  const [editando, setEditando] = useState<Ubicacion | null>(null);

  const guardar = useMutation({
    mutationFn: ({
      membresiaId,
      apodo,
    }: {
      membresiaId: string;
      apodo: string;
    }) => ponerApodoAVivienda(membresiaId, apodo),
    onSuccess: async (valor) => {
      setEditando(null);
      await sincronizar();
      addToast(valor ? "Listo, ya se llama así" : "Nombre quitado", "success");
    },
    onError: () => {
      // Que el fallo llegue a la pantalla: una pantalla que anuncia lo que no
      // intentó es el defecto más caro de este proyecto.
      addToast("No se pudo guardar el nombre", "error");
    },
  });

  return {
    editando,
    guardando: guardar.isPending,
    abrir: setEditando,
    cerrar: () => setEditando(null),
    guardar: (apodo: string) => {
      if (!editando?.membresiaId) return;
      guardar.mutate({ membresiaId: editando.membresiaId, apodo });
    },
  };
}
