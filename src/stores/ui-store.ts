import { create } from 'zustand';
import { mensajeDeError } from '@/shared/utils/error.util';

/** Lo que se lee cuando el fallo no trae una frase para personas. */
const FALLO_SIN_MOTIVO = 'No se pudo completar la acción. Inténtalo de nuevo.';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  addToast: (crudo, type = 'success') => {
    const id = Date.now();
    /*
      Los avisos de error pasan todos por aquí, y casi veinte sitios escribían
      `addToast(error.message, 'error')` con lo que hubiera dicho la base. El
      12/10/2026 el cliente leyó en pantalla «new row for relation
      "reconocimiento" violates check constraint…». Se traduce en el único
      punto por el que pasan todos, en vez de confiar en que cada sitio se
      acuerde.
    */
    const message =
      type === 'error' ? mensajeDeError(crudo, FALLO_SIN_MOTIVO) : crudo;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3500);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
