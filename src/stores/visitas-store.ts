import { create } from 'zustand';
import { VisitaItem } from '@/shared/types';
import { visitasItems } from '@/data/visitasMockData';

interface VisitasState {
  items: VisitaItem[];
  agregar: (visita: Omit<VisitaItem, 'id'> & { id?: number }) => number;
  actualizarEstado: (id: number, estado: string) => void;
  eliminar: (id: number) => void;
  toggleLlegoInvitado: (visitaId: number, invitadoIdx: number) => void;
  toggleFavoritoInvitado: (visitaId: number, invitadoIdx: number) => void;
  agregarInvitado: (visitaId: number, nombre: string) => void;
  aprobarInvitado: (visitaId: number, invitadoIdx: number, estado: string) => void;
  actualizarHoraIngreso: (visitaId: number, invitadoIdx: number, hora: string) => void;
  actualizarHoraSalida: (visitaId: number, invitadoIdx: number, hora: string) => void;
  toggleInstruccionCumplida: (visitaId: number, instruccion: string) => void;
  marcarDocumentoVerificado: (visitaId: number, invitadoIdx: number) => void;
  actualizarVisita: (id: number, patch: Partial<VisitaItem>) => void;
  setLlegoInvitado: (visitaId: number, invitadoIdx: number, llego: boolean) => void;
  marcarLlegadaConVerificacion: (visitaId: number, invitadoIdx: number) => void;
  setItems: (items: VisitaItem[]) => void;
}

export const useVisitasStore = create<VisitasState>((set) => ({
  items: visitasItems,

  agregar: (visita) => {
    const id = visita.id ?? Date.now();
    set((state) => ({
      items: [{ ...visita, id }, ...state.items],
    }));
    return id;
  },

  actualizarEstado: (id, estado) =>
    set((state) => ({
      items: state.items.map((v) =>
        v.id === id ? { ...v, estado } : v
      ),
    })),

  eliminar: (id) =>
    set((state) => ({
      items: state.items.filter((v) => v.id !== id),
    })),

  toggleLlegoInvitado: (visitaId, invitadoIdx) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, llego: !inv.llego } : inv
        );
        const todosLlegaron =
          v.tipo === 'huesped-temporal' && invitados.every((inv) => inv.llego);
        return { ...v, invitados, ...(todosLlegaron ? { estado: 'Ingresado' } : {}) };
      }),
    })),

  toggleFavoritoInvitado: (visitaId, invitadoIdx) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, favorito: !inv.favorito } : inv
        );
        return { ...v, invitados };
      }),
    })),

  agregarInvitado: (visitaId, nombre) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        return {
          ...v,
          invitados: [...v.invitados, { nombre, llego: false, favorito: false }],
        };
      }),
    })),

  aprobarInvitado: (visitaId: number, invitadoIdx: number, estado: string) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, aprobado: estado } : inv
        );
        return { ...v, invitados };
      }),
    })),

  actualizarHoraIngreso: (visitaId, invitadoIdx, hora) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        if (invitadoIdx === -1) return { ...v, horaIngreso: hora };
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, horaIngreso: hora } : inv
        );
        return { ...v, invitados };
      }),
    })),

  actualizarHoraSalida: (visitaId, invitadoIdx, hora) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        if (invitadoIdx === -1) return { ...v, horaSalida: hora };
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, horaSalida: hora } : inv
        );
        return { ...v, invitados };
      }),
    })),

  toggleInstruccionCumplida: (visitaId, instruccion) =>
    set((state) => ({
      items: state.items.map((v) =>
        v.id === visitaId
          ? {
              ...v,
              instruccionesCumplidas: {
                ...v.instruccionesCumplidas,
                [instruccion]: !v.instruccionesCumplidas?.[instruccion],
              },
            }
          : v,
      ),
    })),

  marcarDocumentoVerificado: (visitaId, invitadoIdx) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        if (invitadoIdx === -1) return { ...v, ciVerificado: true } as VisitaItem;
        return {
          ...v,
          invitados: v.invitados.map((inv, index) =>
            index === invitadoIdx ? { ...inv, ciVerificado: true } : inv,
          ),
        };
      }),
    })),

  actualizarVisita: (id, patch) =>
    set((state) => ({
      items: state.items.map((v) =>
        v.id === id ? { ...v, ...patch } : v
      ),
    })),

  setLlegoInvitado: (visitaId, invitadoIdx, llego) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        if (invitadoIdx === -1) return { ...v, llego };
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, llego } : inv
        );
        const todosLlegaron =
          v.tipo === 'huesped-temporal' && invitados.every((inv) => inv.llego);
        return { ...v, invitados, ...(todosLlegaron ? { estado: 'Ingresado' } : {}) };
      }),
    })),

  marcarLlegadaConVerificacion: (visitaId, invitadoIdx) =>
    set((state) => ({
      items: state.items.map((v) => {
        if (v.id !== visitaId) return v;
        if (invitadoIdx === -1) return { ...v, llego: true, ciVerificado: true };
        const invitados = v.invitados.map((inv, i) =>
          i === invitadoIdx ? { ...inv, llego: true, ciVerificado: true } : inv
        );
        const todosLlegaron =
          v.tipo === 'huesped-temporal' && invitados.every((inv) => inv.llego);
        return { ...v, invitados, ...(todosLlegaron ? { estado: 'Ingresado' } : {}) };
      }),
    })),

  setItems: (items) => set({ items }),
}));
