import { createContext, useContext, useState, useCallback } from 'react';
import {
  correspondenciaItems as initialCorrespondencia,
  visitasItems as initialVisitas,
  reservasZona as initialReservas,
  mensajesChat as initialMensajes,
  arquitecturaTorres as initialTorres,
  guardiasSeguridad as initialGuardias,
  permisosViviendas as initialPermisos,
  residentesPropietarioInit,
  ubicacionesInquilinoLiderInit as initialUbicaciones,
  seguridadInit as initialSeguridad,
  configuracionAppInit as initialConfiguracionApp,
  reclamosInit as initialReclamos,
  suscripcionesData,
  configuracionHuespedesTemporalesInit,
  verificacionesData,
  tipologiasData,
  porteriasData,
  estacionamientosVisitantesData,
  bloquesData,
  unidadesData,
  propietariosInvitedData as initialPropietariosInvited,
} from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [edificioActivo, setEdificioActivo] = useState('Las Barranqueras 246');
  const [correspondencia, setCorrespondencia] = useState(initialCorrespondencia);
  const [visitas, setVisitas] = useState(initialVisitas);
  const [reservas, setReservas] = useState(initialReservas);
  const [mensajes, setMensajes] = useState(initialMensajes);
  const [torres, setTorres] = useState(initialTorres);
  const [guardias, setGuardias] = useState(initialGuardias);
  const [permisos, setPermisos] = useState(initialPermisos);
  const [residentesPropietario, setResidentesPropietario] = useState(residentesPropietarioInit);
  const [ubicaciones, setUbicaciones] = useState(initialUbicaciones);
  const [seguridad, setSeguridad] = useState(initialSeguridad);
  const [configuracionApp, setConfiguracionApp] = useState(initialConfiguracionApp);
  const [reclamos, setReclamos] = useState(initialReclamos);
  const [toasts, setToasts] = useState([]);
  const [suscripciones, setSuscripciones] = useState(suscripcionesData);
  const [configHuespedesTemporales, setConfigHuespedesTemporales] = useState(configuracionHuespedesTemporalesInit);
  const [verificaciones, setVerificaciones] = useState(verificacionesData);

  // ─── Administrador · Arquitectura extendida ──────────────────────────────
  const [tipologias, setTipologias] = useState(tipologiasData);
  const [porterias, setPorterias] = useState(porteriasData);
  const [estacionamientosVisitantes, setEstacionamientosVisitantes] = useState(estacionamientosVisitantesData);
  const [bloques, setBloques] = useState(bloquesData);
  const [unidades, setUnidades] = useState(unidadesData);
  const [propietariosInvited, setPropietariosInvited] = useState(initialPropietariosInvited);

  // ─── Onboarding / Autenticación ──────────────────────────────────────────
  // `modo` distingue cómo se entró a la app: 'cuenta' (login/registro real),
  // 'incognito' (invitado, sin cuenta) o 'demo' (acceso directo a un rol).
  const [autenticado, setAutenticado] = useState(false);
  const [modo, setModo] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  // Qué rol demo está activo ('guardia', 'administrador', ...). Permite que
  // pantallas compartidas (como el Home) ramifiquen su comportamiento según
  // el rol sin duplicar pantallas para cada uno.
  const [rolActivo, setRolActivo] = useState(null);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Un usuario "con propiedades" es el que registró al menos una propiedad en
  // el selector de la barra superior (las `ubicaciones`). Login demo y demos
  // de rol arrancan con propiedades; un registro nuevo arranca SIN propiedades
  // y las va agregando. El modo incógnito navega con propiedades de ejemplo.
  const iniciarSesion = useCallback(({ correo }) => {
    setUsuario({
      nombre: 'Guillermo',
      apellido: 'Paredes',
      correo,
      tipoDocumento: 'Cedula',
      verificado: true,
    });
    setModo('cuenta');
    setRolActivo(null);
    setUbicaciones(initialUbicaciones);
    setAutenticado(true);
  }, []);

  const registrarUsuario = useCallback((datos) => {
    setUsuario({ ...datos, verificado: false });
    setModo('cuenta');
    setRolActivo(null);
    setUbicaciones([]); // recién registrado: aún no agregó propiedades
    setAutenticado(true);
    setMostrarBienvenida(true);
  }, []);

  const ingresarIncognito = useCallback(() => {
    setUsuario(null);
    setModo('incognito');
    setRolActivo(null);
    setUbicaciones(initialUbicaciones); // datos de ejemplo para explorar
    setAutenticado(true);
  }, []);

  const ingresarComoDemo = useCallback((rol) => {
    // Demo especial "propietario sin propiedades": mismo rol propietario pero
    // con la lista de propiedades vacía, para mostrar el estado bloqueado.
    const sinProps = rol === 'propietario-sin-propiedades';
    setUsuario(null);
    setModo('demo');
    setRolActivo(sinProps ? 'propietario' : rol);
    setUbicaciones(sinProps ? [] : initialUbicaciones);
    setAutenticado(true);
  }, []);

  const cerrarBienvenida = useCallback(() => setMostrarBienvenida(false), []);

  // Cierra la sesión activa (cuenta, incógnito o demo) y devuelve a la
  // pantalla de ingreso, donde se puede elegir otra demo u otro rol.
  const cerrarSesion = useCallback(() => {
    setUsuario(null);
    setModo(null);
    setRolActivo(null);
    setAutenticado(false);
  }, []);

  const completarVerificacion = useCallback(() => {
    setUsuario(prev => prev ? { ...prev, verificado: true } : prev);
  }, []);

  // Correspondencia
  const agregarCorrespondencia = useCallback((item) => {
    const newItem = { ...item, id: Date.now(), fecha: new Date().toLocaleDateString('es-AR') };
    setCorrespondencia(prev => [newItem, ...prev]);
  }, []);

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
  }, []);

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

  const toggleFavoritoInvitado = useCallback((visitaId, invitadoIdx) => {
    setVisitas(prev => prev.map(v => {
      if (v.id !== visitaId) return v;
      const invitados = v.invitados.map((inv, i) =>
        i === invitadoIdx ? { ...inv, favorito: !inv.favorito } : inv
      );
      return { ...v, invitados };
    }));
  }, []);

  const agregarInvitado = useCallback((visitaId, nombre) => {
    setVisitas(prev => prev.map(v => {
      if (v.id !== visitaId) return v;
      return { ...v, invitados: [...v.invitados, { nombre, llego: false, favorito: false }] };
    }));
    addToast('Invitado agregado con éxito');
  }, [addToast]);

  // Huésped Temporal · Suscripción
  const activarSuscripcion = useCallback((ubicacionId) => {
    setSuscripciones(prev => ({
      ...prev,
      [ubicacionId]: { activa: true, fechaActivacion: new Date().toLocaleDateString('es-AR'), metodoPago: 'VISA' },
    }));
    addToast('Suscripción activada correctamente');
  }, [addToast]);

  // Huésped Temporal · Configuración
  const actualizarConfigHuespedTemporal = useCallback((ubicacionId, datos) => {
    setConfigHuespedesTemporales(prev => ({
      ...prev,
      [ubicacionId]: { ...prev[ubicacionId], ...datos },
    }));
    addToast('Configuración guardada con éxito');
  }, [addToast]);

  // Verificación documental
  const actualizarVerificacion = useCallback((visitaId, invitadoIdx, datos) => {
    setVerificaciones(prev => ({
      ...prev,
      [visitaId]: {
        ...(prev[visitaId] || {}),
        [invitadoIdx]: { ...(prev[visitaId]?.[invitadoIdx] || {}), ...datos },
      },
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

  // Propietario · Residentes
  const agregarResidente = useCallback((datos) => {
    setResidentesPropietario(prev => [...prev, { id: Date.now(), ...datos }]);
  }, []);

  const actualizarResidente = useCallback((residente) => {
    setResidentesPropietario(prev => prev.map(r => r.id === residente.id ? { ...r, ...residente } : r));
  }, []);

  const eliminarResidente = useCallback((id) => {
    setResidentesPropietario(prev => prev.filter(r => r.id !== id));
    addToast('Residente eliminado');
  }, [addToast]);

  // Administrador · Arquitectura
  const agregarTorre = useCallback((datos) => {
    setTorres(prev => {
      const numero = prev.length ? Math.max(...prev.map(t => t.numero)) + 1 : 1;
      return [...prev, { id: Date.now(), numero, ...datos }];
    });
    addToast('Su nueva arquitectura se guardó con éxito');
  }, [addToast]);

  const actualizarTorre = useCallback((torre) => {
    setTorres(prev => prev.map(t => t.id === torre.id ? { ...t, ...torre } : t));
    addToast(`Edición de la torre N° ${torre.numero} realizada con éxito`);
  }, [addToast]);

  const eliminarTorre = useCallback((torre) => {
    setTorres(prev => prev.filter(t => t.id !== torre.id));
    addToast(`Su arquitectura N°${torre.numero} fue eliminada`);
  }, [addToast]);

  // Administrador · Tipologías
  const agregarTipologia = useCallback((datos) => {
    setTipologias(prev => [...prev, { id: Date.now(), ...datos }]);
    addToast('Tipología creada con éxito');
  }, [addToast]);

  const actualizarTipologia = useCallback((item) => {
    setTipologias(prev => prev.map(t => t.id === item.id ? { ...t, ...item } : t));
    addToast('Tipología actualizada con éxito');
  }, [addToast]);

  const eliminarTipologia = useCallback((id) => {
    setTipologias(prev => prev.filter(t => t.id !== id));
    addToast('Tipología eliminada');
  }, [addToast]);

  // Administrador · Porterías
  const agregarPorteria = useCallback((datos) => {
    setPorterias(prev => [...prev, { id: Date.now(), ...datos }]);
    addToast('Portería creada con éxito');
  }, [addToast]);

  const actualizarPorteria = useCallback((item) => {
    setPorterias(prev => prev.map(p => p.id === item.id ? { ...p, ...item } : p));
    addToast('Portería actualizada con éxito');
  }, [addToast]);

  const eliminarPorteria = useCallback((id) => {
    setPorterias(prev => prev.filter(p => p.id !== id));
    addToast('Portería eliminada');
  }, [addToast]);

  // Administrador · Estacionamientos Visitantes
  const actualizarEstacionamientosVisitantes = useCallback((datos) => {
    setEstacionamientosVisitantes(prev => ({ ...prev, ...datos }));
    addToast('Configuración de estacionamientos guardada');
  }, [addToast]);

  // Administrador · Bloques
  const agregarBloque = useCallback((datos) => {
    setBloques(prev => [...prev, { id: Date.now(), ...datos }]);
    addToast('Bloque creado con éxito');
  }, [addToast]);

  const actualizarBloque = useCallback((item) => {
    setBloques(prev => prev.map(b => b.id === item.id ? { ...b, ...item } : b));
    addToast('Bloque actualizado');
  }, [addToast]);

  const eliminarBloque = useCallback((id) => {
    setBloques(prev => prev.filter(b => b.id !== id));
    addToast('Bloque eliminado');
  }, [addToast]);

  // Administrador · Unidades / Asignación de propietarios
  const agregarUnidad = useCallback((datos) => {
    setUnidades(prev => [...prev, { id: Date.now(), ...datos }]);
    addToast('Unidad creada con éxito');
  }, [addToast]);

  const actualizarUnidad = useCallback((item) => {
    setUnidades(prev => prev.map(u => u.id === item.id ? { ...u, ...item } : u));
    addToast('Unidad actualizada');
  }, [addToast]);

  const eliminarUnidad = useCallback((id) => {
    setUnidades(prev => prev.filter(u => u.id !== id));
    addToast('Unidad eliminada');
  }, [addToast]);

  const asignarPropietarioUnidad = useCallback((unidadId, propietarioData) => {
    setUnidades(prev => prev.map(u =>
      u.id === unidadId ? { ...u, propietarioAsignado: propietarioData.nombre, propietarioEmail: propietarioData.email, estado: 'asignado' } : u
    ));
    setPropietariosInvited(prev => [...prev, {
      id: Date.now(),
      nombre: propietarioData.nombre,
      email: propietarioData.email,
      unidadId,
      estado: 'pendiente',
      fechaInvitacion: new Date().toLocaleDateString('es-AR'),
    }]);
    addToast(`Invitación enviada a ${propietarioData.email}`);
  }, [addToast]);

  const aceptarInvitacion = useCallback((invitacionId) => {
    setPropietariosInvited(prev => prev.map(i =>
      i.id === invitacionId ? { ...i, estado: 'aceptada' } : i
    ));
    addToast('Invitación aceptada. Ya puedes administrar esta propiedad.');
  }, [addToast]);

  const marcarUnidadConfigurada = useCallback((unidadId) => {
    setUnidades(prev => prev.map(u =>
      u.id === unidadId ? { ...u, estado: 'configurado' } : u
    ));
  }, []);

  // Administrador · Permisos
  const actualizarPermisos = useCallback((datos) => {
    setPermisos(prev => ({ ...prev, ...datos }));
  }, []);

  // Administrador · Seguridad
  const agregarGuardia = useCallback((datos) => {
    setGuardias(prev => [{ id: Date.now(), ...datos }, ...prev]);
  }, []);

  const actualizarGuardia = useCallback((guardia) => {
    setGuardias(prev => prev.map(g => g.id === guardia.id ? { ...g, ...guardia } : g));
  }, []);

  const eliminarGuardia = useCallback((guardia) => {
    setGuardias(prev => prev.filter(g => g.id !== guardia.id));
    addToast(`El guardia ${guardia.nombre} fue eliminado con éxito`);
  }, [addToast]);

  // Inquilino Líder · Ubicaciones
  const agregarUbicacion = useCallback((datos) => {
    setUbicaciones(prev => [...prev, { id: Date.now(), favorito: false, ...datos }]);
    addToast('Ubicación agregada con éxito');
  }, [addToast]);

  const toggleFavoritoUbicacion = useCallback((id) => {
    setUbicaciones(prev => prev.map(u => ({ ...u, favorito: u.id === id })));
  }, []);

  const eliminarUbicacion = useCallback((id) => {
    setUbicaciones(prev => prev.filter(u => u.id !== id));
    addToast('Ubicación eliminada');
  }, [addToast]);

  // Perfil · Seguridad
  const actualizarSeguridad = useCallback((datos) => {
    setSeguridad(prev => ({ ...prev, ...datos }));
  }, []);

  const pausarCuenta = useCallback(() => {
    setSeguridad(prev => ({ ...prev, pausarCuenta: true }));
    addToast('Cuenta pausada. Vuelve a iniciar sesión para reactivarla');
  }, [addToast]);

  // Perfil · Configuración de App
  const actualizarConfiguracionApp = useCallback((datos) => {
    setConfiguracionApp(prev => ({ ...prev, ...datos }));
  }, []);

  // Perfil · Soporte · Reclamos
  const agregarReclamo = useCallback((datos) => {
    const numero = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const fecha = new Date().toLocaleDateString('es-PE');
    const nuevo = {
      id: Date.now(),
      numero,
      nombre: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido || ''}`.trim() : 'Guillermo Paredes',
      ci: '1782753581',
      estado: 'Pendiente',
      fechaCreacion: fecha,
      fechaRevision: fecha,
      ...datos,
    };
    setReclamos(prev => [nuevo, ...prev]);
    return nuevo;
  }, [usuario]);

  const actualizarEstadoReclamo = useCallback((id, estado) => {
    setReclamos(prev => prev.map(r => r.id === id ? { ...r, estado } : r));
    addToast(`Estado actualizado: ${estado}`);
  }, [addToast]);

  const actualizarEstadoReclamoConMensaje = useCallback((id, estado, mensaje) => {
    const fecha = new Date().toLocaleDateString('es-PE');
    setReclamos(prev => prev.map(r => r.id === id ? { ...r, estado, fechaRevision: fecha, resolucionAdmin: mensaje } : r));
    addToast(`Estado actualizado: ${estado}`);
  }, [addToast]);

  // ─── Estado de usuario derivado ──────────────────────────────────────────
  // Diferencia los tres estados que la UI trata distinto:
  //  - esIncognito:      navega con datos de ejemplo (modo incógnito).
  //  - tienePropiedades: registró al menos una propiedad.
  //  - sinPropiedades:   con cuenta/rol pero sin propiedades → funciones
  //                      bloqueadas (no se usan los empty states de incógnito).
  const esIncognito = modo === 'incognito';
  const tienePropiedades = ubicaciones.length > 0;
  const sinPropiedades = !esIncognito && !tienePropiedades;
  const ubicacionActiva = ubicaciones.find(u => u.favorito) || ubicaciones[0] || null;
  const suscripcionActiva = ubicacionActiva ? suscripciones[ubicacionActiva.id]?.activa || false : false;

  return (
    <AppContext.Provider value={{
      edificioActivo, setEdificioActivo,
      autenticado, modo, usuario, rolActivo,
      esIncognito, tienePropiedades, sinPropiedades,
      iniciarSesion, registrarUsuario, ingresarIncognito, ingresarComoDemo, completarVerificacion, cerrarSesion,
      mostrarBienvenida, cerrarBienvenida,
      correspondencia, agregarCorrespondencia, actualizarEstadoCorrespondencia, eliminarCorrespondencia,
      visitas, agregarVisita, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado,
      toggleFavoritoInvitado, agregarInvitado,
      ubicacionActiva, suscripcionActiva, suscripciones, activarSuscripcion,
      configHuespedesTemporales, actualizarConfigHuespedTemporal,
      verificaciones, actualizarVerificacion,
      reservas, agregarReserva, actualizarEstadoReserva, eliminarReserva,
      mensajes, enviarMensaje,
      torres, agregarTorre, actualizarTorre, eliminarTorre,
      tipologias, agregarTipologia, actualizarTipologia, eliminarTipologia,
      porterias, agregarPorteria, actualizarPorteria, eliminarPorteria,
      estacionamientosVisitantes, actualizarEstacionamientosVisitantes,
      bloques, agregarBloque, actualizarBloque, eliminarBloque,
      unidades, agregarUnidad, actualizarUnidad, eliminarUnidad,
      asignarPropietarioUnidad, propietariosInvited, aceptarInvitacion,
      marcarUnidadConfigurada,
      permisos, actualizarPermisos,
      guardias, agregarGuardia, actualizarGuardia, eliminarGuardia,
      residentesPropietario, agregarResidente, actualizarResidente, eliminarResidente,
      ubicaciones, agregarUbicacion, toggleFavoritoUbicacion, eliminarUbicacion,
      seguridad, actualizarSeguridad, pausarCuenta,
      configuracionApp, actualizarConfiguracionApp,
      reclamos, agregarReclamo, actualizarEstadoReclamo, actualizarEstadoReclamoConMensaje,
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
