import { create } from 'zustand';
import { Ubicacion } from '@/shared/types';

export const ubicacionesDemoInit: Ubicacion[] = [
  { id: 1, direccion: 'Lima, Lima, Mira Flores, San Antonio', alias: 'Casa Amorcito', favorito: true },
  { id: 2, direccion: 'Cusco, Cusco, San Blas, Wanchaq', alias: 'Casa Mama', favorito: false },
];

interface UbicacionState {
  ubicaciones: Ubicacion[];
  edificioActivo: string;

  agregarUbicacion: (datos: Omit<Ubicacion, 'id' | 'favorito'>) => number;
  toggleFavoritoUbicacion: (id: number) => void;
  eliminarUbicacion: (id: number) => void;
  actualizarUbicacion: (id: number, datos: Partial<Ubicacion>) => void;
  setEdificioActivo: (nombre: string) => void;
  setUbicaciones: (ubicaciones: Ubicacion[]) => void;
}

export const useUbicacionStore = create<UbicacionState>((set) => ({
  ubicaciones: ubicacionesDemoInit,
  edificioActivo: 'Las Barranqueras 246',

  agregarUbicacion: (datos) => {
    const id = Date.now();
    set((state) => ({
      ubicaciones: [...state.ubicaciones, { id, favorito: false, ...datos }],
    }));
    return id;
  },

  toggleFavoritoUbicacion: (id) =>
    set((state) => ({
      ubicaciones: state.ubicaciones.map((u) => ({
        ...u,
        favorito: u.id === id,
      })),
    })),

  eliminarUbicacion: (id) =>
    set((state) => ({
      ubicaciones: state.ubicaciones.filter((u) => u.id !== id),
    })),

  actualizarUbicacion: (id, datos) =>
    set((state) => ({
      ubicaciones: state.ubicaciones.map((u) =>
        u.id === id ? { ...u, ...datos } : u
      ),
    })),

  setEdificioActivo: (nombre) => set({ edificioActivo: nombre }),
  setUbicaciones: (ubicaciones) => set({ ubicaciones }),
}));
