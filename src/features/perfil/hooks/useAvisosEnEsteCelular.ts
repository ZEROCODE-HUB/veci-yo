import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import {
  estadoDelCelular,
  escucharEstadoDelCelular,
  pedirPermisoDeAvisos,
} from "@/shared/services/avisosPush";
import { SIN_PUSH, type EstadoDelCelular } from "@/shared/services/avisosPush.logica";

/**
 * La tarjeta «Avisos en este celular»: si el celular puede recibir avisos.
 * El aviso de prueba (22/10/2026) se quitó a pedido del cliente el 29/10/2026.
 */
export function useAvisosEnEsteCelular() {
  const addToast = useUIStore((s) => s.addToast);
  const [estado, setEstado] = useState<EstadoDelCelular>(SIN_PUSH);

  const refrescar = useCallback(() => {
    estadoDelCelular().then(setEstado, () => setEstado(SIN_PUSH));
  }, []);

  useEffect(() => {
    refrescar();
    return escucharEstadoDelCelular(refrescar);
  }, [refrescar]);

  const activar = useMutation({
    mutationFn: () => pedirPermisoDeAvisos(true),
    onSuccess: (concedido) => {
      refrescar();
      if (!concedido) {
        addToast("Sin permiso no llegan avisos. Puedes darlo en los ajustes del celular.", "error");
      }
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    estado,
    activar: () => activar.mutate(),
    activando: activar.isPending,
  };
}
