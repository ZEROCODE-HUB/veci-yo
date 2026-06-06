import { createContext, useContext, useState, useCallback } from 'react';
import {
  correspondenciaItems as initialCorrespondencia,
  visitasItems as initialVisitas,
  reservasZona as initialReservas,
  mensajesChat as initialMensajes,
} from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [edificioActivo, setEdificioActivo] = useState('Las Barranqueras 246');
  const [correspondencia, setCorrespondencia] = useState(initialCorrespondencia);
  const [visitas, setVisitas] = useState(initialVisitas);
  const [reservas, setReservas] = useState(initialReservas);
  const [mensajes, setMensajes] = useState(initialMensajes);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Correspondencia
  const agregarCorrespondencia = useCallback((item) => {
    const newItem = { ...item, id: Date.now(), fecha: new Date().toLocaleDateString('es-AR') };
    setCorrespondencia(prev => [newItem, ...prev]);
    addToast('Correspondencia cargada con éxito');
  }, [addToast]);

  const actualizarEstadoCorrespondencia = useCallback((id, estado) => {
    setCorrespondencia(prev => prev.map(c => c.id === id ? { ...c, estado } : c));
    addToast(`Estado actualizado: ${estado}`);
  }, [addToast]);

  const eliminarCorrespondencia = useCallback((id) => {
    setCorrespondencia(prev => prev.filter(c => c.id !== id));
    addToast('Correspondencia eliminada');
  }, [addToast]);

  // Visitas
  const agregarVisita = useCallback((visita) => {
    const newVisita = { ...visita, id: Date.now() };
    setVisitas(prev => [newVisita, ...prev]);
    addToast('Visita cargada con éxito');
  }, [addToast]);

  const actualizarEstadoVisita = useCallback((id, estado) => {
    setVisitas(prev => prev.map(v => v.id === id ? { ...v, estado } : v));
    addToast(`Estado actualizado: ${estado}`);
  }, [addToast]);

  const eliminarVisita = useCallback((id) => {
    setVisitas(prev => prev.filter(v => v.id !== id));
    addToast('Visita eliminada');
  }, [addToast]);

  const toggleLlegoInvitado = useCallback((visitaId, invitadoIdx) => {
    setVisitas(prev => prev.map(v => {
      if (v.id !== visitaId) return v;
      const invitados = v.invitados.map((inv, i) =>
        i === invitadoIdx ? { ...inv, llego: !inv.llego } : inv
      );
      return { ...v, invitados };
    }));
  }, []);

  // Reservas
  const agregarReserva = useCallback((reserva) => {
    const newReserva = { ...reserva, id: Date.now() };
    setReservas(prev => [...prev, newReserva]);
    addToast('Reserva realizada con éxito');
  }, [addToast]);

  const actualizarEstadoReserva = useCallback((id, estado) => {
    setReservas(prev => prev.map(r => r.id === id ? { ...r, estado } : r));
    addToast(`Estado actualizado: ${estado}`);
  }, [addToast]);

  const eliminarReserva = useCallback((id) => {
    setReservas(prev => prev.filter(r => r.id !== id));
    addToast('Reserva eliminada');
  }, [addToast]);

  // Chat
  const enviarMensaje = useCallback((texto) => {
    const msg = {
      id: Date.now(),
      de: 'portero',
      texto,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      fecha: new Date().toLocaleDateString('es-AR'),
      avatarEmoji: '👮',
    };
    setMensajes(prev => [...prev, msg]);
  }, []);

  return (
    <AppContext.Provider value={{
      edificioActivo, setEdificioActivo,
      correspondencia, agregarCorrespondencia, actualizarEstadoCorrespondencia, eliminarCorrespondencia,
      visitas, agregarVisita, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado,
      reservas, agregarReserva, actualizarEstadoReserva, eliminarReserva,
      mensajes, enviarMensaje,
      toasts, addToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
