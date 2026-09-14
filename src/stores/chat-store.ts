import { create } from 'zustand';
import type { MensajeChat, GrupoChat, LlamadaHistorial } from '@/shared/types';
import { mensajesChatInit, gruposChatInit, historialLlamadasInit } from '@/data/chatMockData';

interface ChatState {
  mensajes: MensajeChat[];
  gruposChat: GrupoChat[];
  historialLlamadas: LlamadaHistorial[];

  enviarMensaje: (texto: string, persona: string) => void;
  marcarMensajesLeidos: () => void;
  marcarMensajesPersonaLeidos: (persona: string) => void;
  enviarMensajeGrupo: (texto: string, grupoId: string, nombre: string) => void;
  marcarMensajesGrupoLeidos: (grupoId: string) => void;
  registrarLlamada: (data: { depto: string; persona: string; tipo?: string; duracion?: string }) => void;
  setMensajes: (mensajes: MensajeChat[]) => void;
  setGruposChat: (grupos: GrupoChat[]) => void;
  setHistorialLlamadas: (llamadas: LlamadaHistorial[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  mensajes: mensajesChatInit,
  gruposChat: gruposChatInit,
  historialLlamadas: historialLlamadasInit,

  enviarMensaje: (texto, persona) => {
    const msg: MensajeChat = {
      id: Date.now(),
      de: 'portero',
      texto,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toLocaleDateString('es-AR'),
      avatarEmoji: '👮',
      leido: false,
      persona,
    };
    set((state) => ({
      mensajes: [...state.mensajes, msg],
    }));
  },

  marcarMensajesLeidos: () =>
    set((state) => ({
      mensajes: state.mensajes.map((m) => ({ ...m, leido: true })),
    })),

  marcarMensajesPersonaLeidos: (persona) =>
    set((state) => ({
      mensajes: state.mensajes.map((m) =>
        m.persona === persona ? { ...m, leido: true } : m,
      ),
    })),

  enviarMensajeGrupo: (texto, grupoId, nombre) =>
    set((state) => ({
      gruposChat: state.gruposChat.map((g) => {
        if (g.id !== grupoId) return g;
        return {
          ...g,
          mensajes: [
            ...g.mensajes,
            {
              id: Date.now(),
              de: nombre,
              texto,
              hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              fecha: new Date().toLocaleDateString('es-AR'),
              leido: false,
            },
          ],
        };
      }),
    })),

  marcarMensajesGrupoLeidos: (grupoId) =>
    set((state) => ({
      gruposChat: state.gruposChat.map((g) => {
        if (g.id !== grupoId) return g;
        return { ...g, mensajes: g.mensajes.map((m) => ({ ...m, leido: true })) };
      }),
    })),

  registrarLlamada: ({ depto, persona, tipo, duracion }) => {
    const entry: LlamadaHistorial = {
      id: Date.now(),
      tipo: (tipo as LlamadaHistorial['tipo']) || 'saliente',
      contacto: persona,
      duracion: duracion || '00:00',
      fecha: new Date().toLocaleDateString('es-AR'),
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };
    set((state) => ({
      historialLlamadas: [entry, ...state.historialLlamadas],
    }));
  },

  setMensajes: (mensajes) => set({ mensajes }),
  setGruposChat: (gruposChat) => set({ gruposChat }),
  setHistorialLlamadas: (historialLlamadas) => set({ historialLlamadas }),
}));
