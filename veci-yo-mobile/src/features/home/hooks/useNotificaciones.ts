import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  marcarNotificacionLeidaRequest,
  obtenerNotificacionesRequest,
} from "../services";
import { useNotificacionesStore } from "../stores";
import type { RolNotificaciones } from "../types";

const ROL_POR_DEFECTO: RolNotificaciones = "residente";

function obtenerRolNotificaciones(rolActivo: string | null): RolNotificaciones {
  if (rolActivo === "guardia" || rolActivo === "administrador") {
    return rolActivo;
  }
  return ROL_POR_DEFECTO;
}

export function useNotificaciones() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const rol = obtenerRolNotificaciones(rolActivo);
  const queryClient = useQueryClient();
  const marcarLeida = useNotificacionesStore((state) => state.marcarLeida);
  const marcarTodasLeidas = useNotificacionesStore(
    (state) => state.marcarTodasLeidas,
  );

  const query = useQuery({
    queryKey: ["home", "notificaciones", rol],
    queryFn: () => obtenerNotificacionesRequest(rol),
  });

  const marcarLeidaMutation = useMutation({
    mutationFn: (id: number) => marcarNotificacionLeidaRequest({ rol, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["home", "notificaciones", rol],
      });
    },
  });

  return {
    ...query,
    rol,
    notificaciones: query.data || [],
    marcarLeida: (id: number) => {
      marcarLeida(rol, id);
      marcarLeidaMutation.mutate(id);
    },
    marcarTodasLeidas: () => {
      marcarTodasLeidas(rol);
      queryClient.invalidateQueries({
        queryKey: ["home", "notificaciones", rol],
      });
    },
  };
}

