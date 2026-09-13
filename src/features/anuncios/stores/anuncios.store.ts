import { create } from "zustand";
import { anuncios as anunciosIniciales } from "../anunciosMockData";
import type { Anuncio } from "../types/anuncios";

interface AnunciosState {
  anuncios: Anuncio[];
  agregarAnuncio: (anuncio: Anuncio) => void;
}

export const useAnunciosStore = create<AnunciosState>((set) => ({
  anuncios: anunciosIniciales,
  agregarAnuncio: (anuncio) =>
    set((state) => ({ anuncios: [anuncio, ...state.anuncios] })),
}));
