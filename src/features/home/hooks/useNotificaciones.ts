import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contarSinLeer,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerNotificaciones,
} from "../services/notificaciones.repo";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";

/**
 * Bandeja del usuario en sesión.
 *
 * Ya no hay un rol de notificaciones: la bandeja es de la persona. El rol
 * decidía antes qué lista fija se mostraba, y con eso una misma cuenta veía
 * avisos distintos según con qué rol hubiera entrado, aunque los hechos fueran
 * los mismos.
 */
export function useNotificaciones() {
  const queryClient = useQueryClient();
  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: ["notificaciones"] });

  const query = useQuery({
    queryKey: ["notificaciones"],
    queryFn: obtenerNotificaciones,
  });

  const addToast = useUIStore((s) => s.addToast);
  // Las dos fallaban en silencio: el aviso seguía sin leer y nadie decía por
  // qué (13/10/2026).
  const alFallar = (fallo: unknown) =>
    addToast(mensajeDeError(fallo, "No se pudo marcar como leída"), "error");

  const marcar = useMutation({
    mutationFn: marcarNotificacionLeida,
    onSuccess: refrescar,
    onError: alFallar,
  });

  const marcarTodas = useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: refrescar,
    onError: alFallar,
  });

  return {
    ...query,
    notificaciones: query.data ?? [],
    marcarLeida: (id: string) => marcar.mutate(id),
    marcarTodasLeidas: () => marcarTodas.mutate(),
  };
}

/** Contador de la campana de la barra superior. */
export function useNotificacionesSinLeer() {
  const { data } = useQuery({
    queryKey: ["notificaciones", "sin-leer"],
    queryFn: contarSinLeer,
  });
  return data ?? 0;
}
