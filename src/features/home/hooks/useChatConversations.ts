import { useMemo } from 'react';
import { useChatStore, useAuthStore } from '@/stores';
import { AVATAR_MAP, DEFAULT_AVATAR } from '@/data/chatMockData';
import type { Conversation, MensajeChat } from '@/shared/types';

interface UseChatConversationsParams {
  soloNoLeidos: boolean;
  filtroChat: 'todos' | 'individuales' | 'grupos';
  tabActiva: 'torres' | 'seguridad' | 'admin';
  filtroTorre: string;
  filtroDepto: string;
}

export function useChatConversations({
  soloNoLeidos,
  filtroChat,
  tabActiva,
  filtroTorre,
  filtroDepto,
}: UseChatConversationsParams) {
  const { mensajes, gruposChat } = useChatStore();
  const { rolActivo } = useAuthStore();

  const esGuardia = rolActivo === 'guardia';
  const esAdmin = rolActivo === 'administrador';
  const esPropietario = rolActivo === 'propietario';
  const esHuespedTemporal = rolActivo === 'huesped-temporal';
  const soloSeguridadAdmin = esHuespedTemporal;

  const gruposVisibles = useMemo(() => {
    if (esGuardia) return [];
    return gruposChat.filter((g) => {
      if (g.tipo === 'residentes') return !esHuespedTemporal;
      if (g.tipo === 'personal') return esPropietario;
      return false;
    });
  }, [gruposChat, esGuardia, esPropietario, esHuespedTemporal]);

  const conversations = useMemo(() => {
    const map: Record<string, Conversation> = {};
    mensajes.forEach((msg) => {
      const p = msg.persona || 'Desconocido';
      if (!map[p]) {
        map[p] = {
          id: p, tipo: 'individual', nombre: p,
          ultimoMensaje: '', ultimaHora: '', ultimaFecha: '',
          avatarEmoji: AVATAR_MAP[p] || DEFAULT_AVATAR, noLeidos: 0,
        };
      }
      map[p].ultimoMensaje = msg.texto;
      map[p].ultimaHora = msg.hora;
      map[p].ultimaFecha = msg.fecha;
      map[p].avatarEmoji = AVATAR_MAP[p] || msg.avatarEmoji || DEFAULT_AVATAR;
      if (!msg.leido) map[p].noLeidos++;
    });

    const result = Object.values(map);

    if (esGuardia && !result.find((c) => c.nombre === 'Seguridad')) {
      result.push({
        id: 'Seguridad', tipo: 'individual', nombre: 'Seguridad',
        ultimoMensaje: '', ultimaHora: '', ultimaFecha: '',
        avatarEmoji: '👮', noLeidos: 0,
      });
    }

    if (esAdmin && !result.find((c) => c.nombre === 'Administrador')) {
      result.push({
        id: 'Administrador', tipo: 'individual', nombre: 'Administrador',
        ultimoMensaje: '', ultimaHora: '', ultimaFecha: '',
        avatarEmoji: '🛡️', noLeidos: 0,
      });
    }

    if (soloSeguridadAdmin) {
      if (!result.find((c) => c.nombre === 'Seguridad')) {
        result.push({
          id: 'Seguridad', tipo: 'individual', nombre: 'Seguridad',
          ultimoMensaje: 'Chat con seguridad — disponible para ayudarte',
          ultimaHora: '', ultimaFecha: '', avatarEmoji: '👮', noLeidos: 0,
        });
      }
      if (!result.find((c) => c.nombre === 'Administrador')) {
        result.push({
          id: 'Administrador', tipo: 'individual', nombre: 'Administrador',
          ultimoMensaje: 'Chat con administración — disponible para ayudarte',
          ultimaHora: '', ultimaFecha: '', avatarEmoji: '🛡️', noLeidos: 0,
        });
      }
    }

    gruposVisibles.forEach((grupo) => {
      const noLeidos = grupo.mensajes.filter((m) => !m.leido).length;
      const ultimo = grupo.mensajes[grupo.mensajes.length - 1] || ({} as MensajeChat);
      result.push({
        id: grupo.id, tipo: 'grupo', nombre: grupo.nombre,
        ultimoMensaje: ultimo.texto || '', ultimaHora: ultimo.hora || '',
        ultimaFecha: ultimo.fecha || '', avatarEmoji: grupo.avatarEmoji,
        noLeidos, grupoId: grupo.id,
      });
    });

    return result;
  }, [mensajes, gruposVisibles, esGuardia, esAdmin, soloSeguridadAdmin]);

  const convFiltradas = useMemo(() => {
    return conversations.filter((c) => {
      if (soloNoLeidos && c.noLeidos === 0) return false;
      if (soloSeguridadAdmin && c.nombre !== 'Seguridad' && c.nombre !== 'Administrador') return false;
      if (filtroChat === 'individuales' && c.tipo !== 'individual') return false;
      if (filtroChat === 'grupos' && c.tipo !== 'grupo') return false;
      if (esGuardia) {
        if (tabActiva === 'seguridad') return c.nombre === 'Seguridad';
        if (tabActiva === 'admin') return c.nombre === 'Administrador';
        if (tabActiva === 'torres') {
          if (c.nombre === 'Seguridad' || c.nombre === 'Administrador') return false;
          if (filtroTorre && c.nombre !== filtroTorre) return false;
          if (filtroDepto && !c.nombre.includes(filtroDepto)) return false;
        }
      }
      return true;
    });
  }, [conversations, soloNoLeidos, soloSeguridadAdmin, filtroChat, esGuardia, tabActiva, filtroTorre, filtroDepto]);

  const totalNoLeidos = useMemo(
    () => conversations.reduce((s, c) => s + c.noLeidos, 0),
    [conversations],
  );

  return {
    conversations,
    convFiltradas,
    totalNoLeidos,
    esGuardia,
    esAdmin,
    esHuespedTemporal,
    soloSeguridadAdmin,
  };
}
