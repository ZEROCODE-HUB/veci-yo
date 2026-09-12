import { create } from 'zustand';
import { ReservaZona } from '@/shared/types';
import { reservasZona, zonasComunesConfigInit } from '@/data/zonasMockData';
import { gestionZonasAdmin } from '@/data/adminMockData';

export interface ZonaComunConfig {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  horariosDisponibles: string[];
  duracionPermitida: number;
  reglas: string;
  capacidadMaxima: number;
  requiereAprobacion: boolean;
  disponibles?: number;
  usaSlots?: boolean;
  restringidaHuesped?: boolean;
}

export interface GestionZona {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  imagen: string | null;
  horarioApertura: string;
  horarioCierre: string;
  duracionMinima: number;
  duracionMaxima: number;
  tiempoMinimoEntreReservas: number;
  diasHabilitados: string[];
  fechasEspeciales: Array<{ fecha: string; tipo: string; motivo: string }>;
  montoGarantia: number;
  costoLimpieza: number;
  costoReserva: number;
  moneda: string;
  activa: boolean;
  usaSlots?: boolean;
  duracionPermitida?: number;
  horariosDisponibles?: string[];
  reglamento?: string;
  requiereAprobacion?: boolean;
  permiteCorta?: boolean;
  permiteLarga?: boolean;
}

interface ZonasState {
  zonasComunesConfig: Record<string, ZonaComunConfig>;
  gestionZonas: Record<string, GestionZona>;
  reservas: ReservaZona[];

  actualizarZonaComun: (zonaId: string, datos: Partial<ZonaComunConfig>) => void;
  agregarZonaComun: (datos: ZonaComunConfig) => void;
  eliminarZonaComun: (zonaId: string) => void;
  actualizarGestionZona: (zonaId: string, datos: Partial<GestionZona>, zonaConfig?: Partial<ZonaComunConfig>) => void;
  agregarGestionZona: (datos: GestionZona, zonaConfig?: Partial<ZonaComunConfig>) => void;
  eliminarGestionZona: (zonaId: string) => void;
  agregarReserva: (reserva: Omit<ReservaZona, 'id'>) => void;
  actualizarPersonaReserva: (reservaId: number, personaIdx: number, datos: Partial<{ nombre: string; llego: boolean | 'salio'; tipoParticipante: string }>) => void;
  actualizarEstadoReserva: (id: number, estado: string) => void;
  actualizarReserva: (id: number, datos: Partial<ReservaZona>) => void;
  eliminarReserva: (id: number) => void;
  setZonasComunesConfig: (config: Record<string, ZonaComunConfig>) => void;
  setGestionZonas: (gestion: Record<string, GestionZona>) => void;
  setReservas: (reservas: ReservaZona[]) => void;
}

export const useZonasStore = create<ZonasState>((set) => ({
  zonasComunesConfig: zonasComunesConfigInit,
  gestionZonas: gestionZonasAdmin,
  reservas: reservasZona,

  actualizarZonaComun: (zonaId, datos) =>
    set((state) => ({
      zonasComunesConfig: {
        ...state.zonasComunesConfig,
        [zonaId]: { ...state.zonasComunesConfig[zonaId], ...datos },
      },
    })),

  agregarZonaComun: (datos) => {
    const id = datos.id || `zona-${Date.now()}`;
    set((state) => ({
      zonasComunesConfig: { ...state.zonasComunesConfig, [id]: { ...datos, id } },
    }));
  },

  eliminarZonaComun: (zonaId) =>
    set((state) => {
      const next = { ...state.zonasComunesConfig };
      delete next[zonaId];
      return { zonasComunesConfig: next };
    }),

  actualizarGestionZona: (zonaId, datos, zonaConfig) =>
    set((state) => {
      const updates: Partial<ZonasState> = {
        gestionZonas: {
          ...state.gestionZonas,
          [zonaId]: { ...state.gestionZonas[zonaId], ...datos },
        },
      };
      if (zonaConfig) {
        updates.zonasComunesConfig = {
          ...state.zonasComunesConfig,
          [zonaId]: { ...state.zonasComunesConfig[zonaId], ...zonaConfig },
        };
      }
      return updates;
    }),

  agregarGestionZona: (datos, zonaConfig) => {
    const id = datos.id || `zona-${Date.now()}`;
    set((state) => ({
      gestionZonas: { ...state.gestionZonas, [id]: { ...datos, id } },
      zonasComunesConfig: {
        ...state.zonasComunesConfig,
        [id]: {
          id,
          nombre: datos.nombre,
          emoji: '🏠',
          descripcion: datos.descripcion || '',
          horariosDisponibles: zonaConfig?.horariosDisponibles || [],
          duracionPermitida: zonaConfig?.duracionPermitida || 2,
          reglas: zonaConfig?.reglas || '',
          capacidadMaxima: 10,
          requiereAprobacion: zonaConfig?.requiereAprobacion || false,
        },
      },
    }));
  },

  eliminarGestionZona: (zonaId) =>
    set((state) => {
      const nextGestion = { ...state.gestionZonas };
      delete nextGestion[zonaId];
      const nextConfig = { ...state.zonasComunesConfig };
      delete nextConfig[zonaId];
      return { gestionZonas: nextGestion, zonasComunesConfig: nextConfig };
    }),

  agregarReserva: (reserva) => {
    const personasConTipo = (reserva.personas || []).map((p) => ({
      nombre: p.nombre || '',
      llego: p.llego || false,
      tipoParticipante: p.tipoParticipante || 'Residente',
    }));
    const newReserva = { ...reserva, personas: personasConTipo, id: Date.now() };
    set((state) => ({
      reservas: [...state.reservas, newReserva],
    }));
  },

  actualizarPersonaReserva: (reservaId, personaIdx, datos) =>
    set((state) => ({
      reservas: state.reservas.map((r) => {
        if (r.id !== reservaId) return r;
        const personas = r.personas.map((p, i) =>
          i === personaIdx ? { ...p, ...datos } : p
        );
        return { ...r, personas };
      }),
    })),

  actualizarEstadoReserva: (id, estado) =>
    set((state) => ({
      reservas: state.reservas.map((r) => (r.id === id ? { ...r, estado } : r)),
    })),

  actualizarReserva: (id, datos) =>
    set((state) => ({
      reservas: state.reservas.map((r) => (r.id === id ? { ...r, ...datos } : r)),
    })),

  eliminarReserva: (id) =>
    set((state) => ({
      reservas: state.reservas.filter((r) => r.id !== id),
    })),

  setZonasComunesConfig: (config) => set({ zonasComunesConfig: config }),
  setGestionZonas: (gestion) => set({ gestionZonas: gestion }),
  setReservas: (reservas) => set({ reservas }),
}));
