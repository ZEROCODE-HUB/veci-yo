import { create } from "zustand";
import { notificaciones } from "../homeMockData";
import type { Notificacion, RolNotificaciones } from "../types";

interface NotificacionesState {
  notificaciones: Record<string, Notificacion[]>;
  marcarLeida: (rol: RolNotificaciones, id: number) => void;
  marcarTodasLeidas: (rol: RolNotificaciones) => void;
}

export const useNotificacionesStore = create<NotificacionesState>((set) => ({
  notificaciones,

  marcarLeida: (rol, id) =>
    set((state) => ({
      notificaciones: {
        ...state.notificaciones,
        [rol]: (state.notificaciones[rol] || []).map((item) =>
          item.id === id ? { ...item, leida: true } : item,
        ),
      },
    })),

  marcarTodasLeidas: (rol) =>
    set((state) => ({
      notificaciones: {
        ...state.notificaciones,
        [rol]: (state.notificaciones[rol] || []).map((item) => ({
          ...item,
          leida: true,
        })),
      },
    })),
}));
