import { create } from "zustand";
import { formatDate } from "@/shared/utils";

interface Suscripcion {
  activa: boolean;
  fechaActivacion?: string;
  metodoPago?: string;
}

interface SuscripcionState {
  suscripciones: Record<number, Suscripcion>;
  activarSuscripcion: (ubicacionId: number) => void;
}

export const useSuscripcionStore = create<SuscripcionState>((set) => ({
  suscripciones: {},
  activarSuscripcion: (ubicacionId) =>
    set((state) => ({
      suscripciones: {
        ...state.suscripciones,
        [ubicacionId]: {
          activa: true,
          fechaActivacion: formatDate(new Date()),
          metodoPago: "VISA",
        },
      },
    })),
}));
