import { create } from "zustand";
import type { CorrespondenciaItem } from "@/shared/types";
import { correspondenciaItems } from "@/data/correspondenciaMockData";

interface CorrespondenciaState {
  items: CorrespondenciaItem[];
  agregar: (item: Omit<CorrespondenciaItem, "id" | "fecha">) => void;
  actualizarEstado: (
    id: number,
    estado: CorrespondenciaItem["estado"],
    extras?: Partial<CorrespondenciaItem>,
  ) => void;
  eliminar: (id: number) => void;
  setItems: (items: CorrespondenciaItem[]) => void;
}


export const useCorrespondenciaFeatureStore = create<CorrespondenciaState>(
  (set) => ({
    items: correspondenciaItems,
    agregar: (item) =>
      set((state) => ({
        items: [
          {
            ...item,
            id: Date.now(),
            fecha: new Date().toLocaleDateString("es-AR"),
          },
          ...state.items,
        ],
      })),
    actualizarEstado: (id, estado, extras = {}) =>
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, estado, ...extras } : item,
        ),
      })),
    eliminar: (id) =>
      set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    setItems: (items) => set({ items }),
  }),
);
