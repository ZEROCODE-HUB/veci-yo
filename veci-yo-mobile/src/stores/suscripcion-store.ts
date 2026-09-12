import { create } from "zustand";

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
          fechaActivacion: new Date().toLocaleDateString("es-AR"),
          metodoPago: "VISA",
        },
      },
    })),
}));
