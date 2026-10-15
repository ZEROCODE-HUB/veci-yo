import { create } from "zustand";

/**
 * La llamada del intercomunicador que está abierta ahora mismo, si hay una
 * (14/10/2026). La empieza quien llama (`iniciar`) o quien contesta, y la
 * pinta `Intercomunicador`, que está montado una sola vez en toda la app.
 */
interface IntercomState {
  llamadaId: string | null;
  soyQuienLlama: boolean;
  /** A quién se llama o quién llama, para enseñarlo. */
  etiqueta: string;
  iniciar: (llamadaId: string, soyQuienLlama: boolean, etiqueta: string) => void;
  terminar: () => void;
}

export const useIntercomStore = create<IntercomState>((set) => ({
  llamadaId: null,
  soyQuienLlama: false,
  etiqueta: "",
  iniciar: (llamadaId, soyQuienLlama, etiqueta) => set({ llamadaId, soyQuienLlama, etiqueta }),
  terminar: () => set({ llamadaId: null, soyQuienLlama: false, etiqueta: "" }),
}));
