import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contarSinLeer,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerNotificaciones,
} from "../services/notificaciones.repo";

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

  const marcar = useMutation({
    mutationFn: marcarNotificacionLeida,
    onSuccess: refrescar,
  });

  const marcarTodas = useMutation({
    mutationFn: marcarTodasLeidas,
    onSuccess: refrescar,
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
