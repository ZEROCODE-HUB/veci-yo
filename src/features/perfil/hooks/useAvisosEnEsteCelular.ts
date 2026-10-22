import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import {
  estadoDelCelular,
  escucharEstadoDelCelular,
  pedirPermisoDeAvisos,
} from "@/shared/services/avisosPush";
import { SIN_PUSH, type EstadoDelCelular } from "@/shared/services/avisosPush.logica";
import {
  enviarAvisoDePrueba,
  obtenerEnvioPush,
  type EnvioPush,
} from "@/features/home/services/notificaciones.repo";

/** Cada cuánto se pregunta en qué quedó el aviso de prueba, mientras no esté resuelto. */
const CADA_MS = 2000;

/** Un envío ya no va a cambiar: llegó, o no salió por un motivo que ya se sabe. */
export function envioResuelto(envio: EnvioPush | null | undefined): boolean {
  if (!envio) return false;
  if (envio.recibidoEn) return true;
  return envio.estado === "error" || envio.estado === "sin_dispositivo" || envio.estado === "apagado";
}

/**
 * La tarjeta «Avisos en este celular»: si el celular puede recibir avisos y un
 * botón para mandarse uno de prueba y ver si llegó.
 *
 * Lo pidió el cliente el 22/10/2026 al conectar OneSignal: «poner un campo
 * aparte para confirmar que está llegando bien esa notificación push». La
 * confirmación no la escribe la persona: la marca la app sola cuando el push
 * le llega (ver `AvisosPushDeLaSesion`), y aquí se lee de `envio_push`.
 */
export function useAvisosEnEsteCelular() {
  const addToast = useUIStore((s) => s.addToast);
  const [estado, setEstado] = useState<EstadoDelCelular>(SIN_PUSH);
  const [pruebaId, setPruebaId] = useState<string | null>(null);

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

  const enviar = useMutation({
    mutationFn: enviarAvisoDePrueba,
    onSuccess: (id) => setPruebaId(id),
    onError: (error: Error) => addToast(error.message, "error"),
  });

  const envio = useQuery({
    queryKey: ["envio-push", pruebaId],
    queryFn: () => obtenerEnvioPush(pruebaId!),
    enabled: Boolean(pruebaId),
    refetchInterval: (query) => (envioResuelto(query.state.data) ? false : CADA_MS),
  });

  return {
    estado,
    activar: () => activar.mutate(),
    activando: activar.isPending,
    enviarPrueba: () => enviar.mutate(),
    enviando: enviar.isPending,
    envio: pruebaId ? (envio.data ?? null) : undefined,
  };
}
