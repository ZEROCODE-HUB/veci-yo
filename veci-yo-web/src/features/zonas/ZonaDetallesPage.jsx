import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import { useApp } from '../../context/AppContext';
import { zonasComunes, cantidadPersonas, horasReserva, departamentos } from '../../data/mockData';
import theme from '../../config/theme';
import zonaIcons, { zonaBanners } from '../../assets/icons/zonas';

const borderByEstadoGuardia = {
  Aprobado: theme.colors.secondary,
  Pendiente: theme.colors.textMuted,
  Cancelado: theme.colors.danger,
};
const borderByEstado = {
  Reservado: theme.colors.primary,
  Aprobado: theme.colors.success,
  Pendiente: theme.colors.warning,
  Rechazado: theme.colors.danger,
  Disponible: theme.colors.secondary,
  'No disponible': 'transparent',
};

const chipDia = (activo) => ({
  padding: '6px 14px',
  borderRadius: theme.radius.full,
  border: `1.5px solid ${activo ? theme.colors.primary : theme.colors.border}`,
  background: activo ? theme.colors.primary : theme.colors.bgCard,
  color: activo ? '#fff' : theme.colors.textSecondary,
  fontSize: theme.fonts.sizes.xs,
  fontWeight: theme.fonts.weights.semibold,
  cursor: 'pointer',
  fontFamily: theme.fonts.family,
});

const estilosPersona = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: theme.radius.lg,
    background: theme.colors.bgMuted,
    border: `1px solid ${theme.colors.border}`,
  },
  botonLlego: (activo) => ({
    padding: '6px 14px',
    borderRadius: theme.radius.full,
    cursor: 'pointer',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    fontFamily: theme.fonts.family,
    background: activo ? theme.colors.success : theme.colors.bgCard,
    color: activo ? '#fff' : theme.colors.textSecondary,
    border: activo ? 'none' : `1px solid ${theme.colors.border}`,
  }),
  botonNoLlego: (activo) => ({
    padding: '6px 14px',
    borderRadius: theme.radius.full,
    cursor: 'pointer',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    fontFamily: theme.fonts.family,
    background: activo ? theme.colors.danger : theme.colors.bgCard,
    color: activo ? '#fff' : theme.colors.textSecondary,
    border: activo ? 'none' : `1px solid ${theme.colors.border}`,
  }),
};

export default function ZonaDetallesPage() {
  const { zonaId } = useParams();
  const navigate = useNavigate();
  const { reservas, actualizarEstadoReserva, eliminarReserva, addToast, rolActivo, actualizarPersonaReserva, usuario, zonasComunesConfig } = useApp();

  const zona = zonasComunes.find(z => z.id === zonaId) || { nombre: zonaId, emoji: '🏢' };
  const zonasReservasAll = reservas.filter(r => r.zonaId === zonaId);
  const zonasReservas = reservas.filter(r => {
    if (r.zonaId !== zonaId) return false;
    if (rolActivo === 'guardia' || rolActivo === 'administrador') return true;
    const nombreUsuario = usuario?.nombre?.toLowerCase().split(' ')[0] || '';
    if (!nombreUsuario) return false;
    const esCreador = r.nombre?.toLowerCase().includes(nombreUsuario);
    const esInvitado = r.personas?.some(p => p.nombre?.toLowerCase().includes(nombreUsuario));
    return esCreador || esInvitado;
  });

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [filtrosAbierto, setFiltrosAbierto] = useState(true);
  const [filtroDia, setFiltroDia] = useState('hoy');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [reglamentoOpen, setReglamentoOpen] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editPersonasOpen, setEditPersonasOpen] = useState(false);
  const [editPersonasItem, setEditPersonasItem] = useState(null);
  const [editPersonasList, setEditPersonasList] = useState([]);
  const [editPersonasCount, setEditPersonasCount] = useState(0);
  const [incidenciaOpen, setIncidenciaOpen] = useState(false);
  const [incidenciaItem, setIncidenciaItem] = useState(null);
  const [incidenciaTexto, setIncidenciaTexto] = useState('');
  const [liberarOpen, setLiberarOpen] = useState(false);
  const [liberarItem, setLiberarItem] = useState(null);
  const [liberarCuposInput, setLiberarCuposInput] = useState(0);
  const [reemplazoInput, setReemplazoInput] = useState({});

  const esGuardia = rolActivo === 'guardia';

  // Guardia/Admin: antes de crear una reserva deben indicar para qué departamento
  const esGuardiaAdmin = esGuardia || rolActivo === 'administrador';
  const [deptoReservaOpen, setDeptoReservaOpen] = useState(false);
  const [deptoReserva, setDeptoReserva] = useState('');
  const [deptoReservaTarget, setDeptoReservaTarget] = useState(null);

  const abrirReserva = (horaPre, fechaPre) => {
    if (esGuardiaAdmin) {
      setDeptoReserva('');
      setDeptoReservaTarget({ horaPre, fechaPre });
      setDeptoReservaOpen(true);
    } else {
      navigate(`/zonas-comunes/${zonaId}/reservar`, { state: { horaPre, fechaPre } });
    }
  };

  const confirmarReserva = () => {
    setDeptoReservaOpen(false);
    navigate(`/zonas-comunes/${zonaId}/reservar`, {
      state: { ...deptoReservaTarget, deptoReserva },
    });
  };

  const nombreDia = (fecha) => ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fecha.getDay()];
  const hoy = new Date();
  const manana = new Date(hoy.getTime() + 86400000);

  const diasEnRango = (desde, hasta) => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const resultado = [];
    if (!desde || !hasta) return resultado;
    const d = new Date(desde + 'T00:00:00');
    const h = new Date(hasta + 'T00:00:00');
    if (h < d) return resultado;
    while (d <= h) {
      resultado.push(dias[d.getDay()]);
      d.setDate(d.getDate() + 1);
    }
    return resultado;
  };

  const diasRango = fechaDesde && fechaHasta ? diasEnRango(fechaDesde, fechaHasta) : [];
  const diasRelevantes = filtroDia === 'hoy' ? [nombreDia(hoy)] : filtroDia === 'manana' ? [nombreDia(manana)] : diasRango;

  const matchDia = (r) => {
    if (!diasRelevantes.length) return true;
    const h = (r.horario || '').toLowerCase();
    return diasRelevantes.some(d => h.startsWith(d.toLowerCase()));
  };

  const filtered = zonasReservas.filter(r => {
    const matchSearch = !search || r.depto.toLowerCase().includes(search.toLowerCase());
    const matchTab = !activeTab || r.estado === activeTab;
    return matchSearch && matchTab && matchDia(r);
  });

  // Disponibilidad por slots (zonas que usan modelo de slots)
  const slotsDisponibles = (zona.usaSlots && diasRelevantes.length) ? horasReserva.map(slot => {
    const inicio = slot.split(' ')[0];
    const reservasSlot = zonasReservas.filter(r =>
      (r.horario || '').includes(inicio) &&
      diasRelevantes.some(d => (r.horario || '').toLowerCase().includes(d.toLowerCase()))
    );
    return { slot, reservas: reservasSlot, libres: Math.max(0, zona.total - reservasSlot.length) };
  }) : [];

  const reglamentoTexto = zonasComunesConfig?.[zonaId]?.reglas || zona.reglamento || 'Esta zona no tiene reglamento definido.';

  const handleEstado = (estado) => {
    actualizarEstadoReserva(menuItem.id, estado);
    setMenuItem(null);
  };

  const handleEliminar = () => {
    eliminarReserva(deleteItem.id);
    setDeleteItem(null);
  };

  const abrirEditarPersonas = (item) => {
    setEditPersonasItem(item);
    setEditPersonasList(item.personas ? item.personas.map(p => ({ ...p })) : []);
    setEditPersonasCount(item.personas ? item.personas.length : 0);
    setMenuItem(null);
    setEditPersonasOpen(true);
  };

  const setPersonaLlego = (idx, valor) => {
    setEditPersonasList(prev => prev.map((p, i) =>
      i === idx ? { ...p, llego: valor } : p
    ));
  };

  const guardarPersonas = () => {
    editPersonasList.forEach((p, idx) => {
      actualizarPersonaReserva(editPersonasItem.id, idx, { nombre: p.nombre, llego: p.llego, tipoParticipante: p.tipoParticipante });
    });
    addToast('Asistencia registrada correctamente');
    setEditPersonasOpen(false);
    setEditPersonasItem(null);
  };

  const TIPOS_PARTICIPANTE = ['Residente', 'Visitante', 'Huésped Temporal'];

  const statusColorsGuardia = {
    Todos: { bg: theme.colors.success, color: '#fff' },
    Aprobada: { bg: theme.colors.secondary, color: '#fff' },
    Pendiente: { bg: theme.colors.textMuted, color: '#fff' },
    Cancelada: { bg: theme.colors.danger, color: '#fff' },
  };

  const statusColorsZona = {
    Todos: { bg: theme.colors.text, color: '#fff' },
    Reservado: { bg: '#F59E0B', color: '#fff' },
    Aprobado: { bg: theme.colors.secondary, color: '#fff' },
    Pendiente: { bg: theme.colors.statusGray, color: theme.colors.textSecondary },
    Disponible: { bg: '#16A34A', color: '#fff' },
    'No disponible': { bg: '#EF4444', color: '#fff' },
  };

  return (
    <AppShell>
      <PageHeader
        title={zona.nombre}
        action={
          <button
            onClick={() => abrirReserva('', '')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: theme.radius.md,
              background: theme.colors.primary,
              color: '#fff',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            +
          </button>
        }
      />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Zone banner */}
        <div
          style={{
            width: '100%',
            height: '180px',
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #D4C5A9 0%, #B8A98C 100%)',
          }}
        >
          {zonaBanners[zona.id] ? (
            <img
              src={zonaBanners[zona.id]}
              alt={zona.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : zonaIcons[zona.id] ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={zonaIcons[zona.id]} alt={zona.nombre} style={{ width: '80px', height: '80px', objectFit: 'contain', opacity: 0.7 }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '48px' }}>{zona.emoji}</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
            <span style={{ color: '#fff', fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.lg, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{zona.nombre}</span>
          </div>
        </div>

        {/* Reglamento */}
        <button
          onClick={() => setReglamentoOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            borderRadius: theme.radius.lg,
            border: `1.5px solid ${theme.colors.border}`,
            background: theme.colors.bgCard,
            color: theme.colors.textSecondary,
            fontSize: theme.fonts.sizes.sm,
            fontWeight: theme.fonts.weights.semibold,
            cursor: 'pointer',
            fontFamily: theme.fonts.family,
          }}
        >
          📋 Reglamento de la zona
        </button>

        {/* Filter card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, flex: 1 }}>
              Lista de reservas
            </span>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginRight: '8px' }}>
              Buscar y filtrar
            </span>
            <button
              onClick={() => setFiltrosAbierto(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textMuted,
                fontSize: '16px',
                padding: '4px 8px',
                transition: 'transform 200ms',
                transform: filtrosAbierto ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▾
            </button>
          </div>
          {filtrosAbierto && (
            <>
              <SearchBar value={search} onChange={setSearch} />
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setFiltroDia('hoy')} style={chipDia(filtroDia === 'hoy')}>Hoy</button>
                <button onClick={() => setFiltroDia('manana')} style={chipDia(filtroDia === 'manana')}>Mañana</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>Desde</span>
                  <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setFiltroDia(null); }} style={{ padding: '6px 10px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.xs, fontFamily: theme.fonts.family }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>Hasta</span>
                  <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setFiltroDia(null); }} style={{ padding: '6px 10px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.xs, fontFamily: theme.fonts.family }} />
                </div>
                {(filtroDia || fechaDesde || fechaHasta) && (
                  <button onClick={() => { setFiltroDia(null); setFechaDesde(''); setFechaHasta(''); }} style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Limpiar</button>
                )}
              </div>
              <div style={{ marginTop: '10px' }}>
                <StatusTabs
                  tabs={esGuardia ? ['Todos', 'Aprobada', 'Pendiente', 'Cancelada'] : ['Todos', 'Reservado', 'Aprobado', 'Pendiente', 'No disponible', 'Disponible']}
                  active={activeTab || 'Todos'}
                  onChange={tab => {
                    const map = { Todos: null, Aprobada: 'Aprobado', Cancelada: 'Cancelado' };
                    const val = map[tab] ?? tab;
                    setActiveTab(val && val !== 'Todos' ? val : null);
                  }}
                  centered
                  statusColors={esGuardia ? statusColorsGuardia : statusColorsZona}
                />
              </div>
            </>
          )}
        </div>

        {/* Disponibilidad — vista estilo calendario Google Calendar mobile */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '8px' }}>
            {zona.usaSlots ? 'Horarios disponibles' : `Horario libre (máx ${zona.duracionMaxima} h)`}
          </div>
          {diasRelevantes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {(() => {
                const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                const normalizar = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const parseHorario = (horario) => {
                  if (!horario) return null;
                  const h = horario.toLowerCase();
                  const match = h.match(/(\d{1,2})[:\s]*(\d{2})?\s*(?:hs\.?|hs|a|-)\s*(\d{1,2})[:\s]*(\d{2})?/);
                  if (!match) return null;
                  const iniH = parseInt(match[1]); const iniM = parseInt(match[2] || '0');
                  const finH = parseInt(match[3]); const finM = parseInt(match[4] || '0');
                  if (isNaN(iniH) || isNaN(finH)) return null;
                  return { iniMin: iniH * 60 + iniM, finMin: finH * 60 + finM };
                };
                const tieneDiaNominal = (horario) => {
                  const h = normalizar(horario);
                  return NOMBRES_DIAS.some(d => h.includes(d));
                };
                const matchDiaHorario = (horario) => {
                  const h = normalizar(horario);
                  if (!tieneDiaNominal(horario)) return true;
                  return diasRelevantes.some(d => h.includes(normalizar(d)));
                };
                const horasBase = [];
                for (let h = 8; h <= 22; h++) {
                  horasBase.push(`${String(h).padStart(2, '0')}:00`);
                  if (h < 22) horasBase.push(`${String(h).padStart(2, '0')}:30`);
                }
                const reservasPorHora = {};
                zonasReservasAll.forEach(r => {
                  const parsed = parseHorario(r.horario);
                  if (!parsed) return;
                  if (!matchDiaHorario(r.horario)) return;
                  horasBase.forEach(h => {
                    const [hh, mm] = h.split(':').map(Number);
                    const slotMin = hh * 60 + mm;
                    if (slotMin >= parsed.iniMin && slotMin < parsed.finMin) {
                      if (!reservasPorHora[h]) reservasPorHora[h] = [];
                      reservasPorHora[h].push(r);
                    }
                  });
                });
                const esGuardiaAdmin = esGuardia || rolActivo === 'administrador';
                const nombreUsuario = (usuario?.nombre?.toLowerCase().split(' ')[0] || '').toLowerCase();
                const fechaSlot = filtroDia === 'hoy' ? new Date() : filtroDia === 'manana' ? new Date(Date.now() + 86400000) : (fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date());
                return horasBase.map(h => {
                  const reservasEnSlot = reservasPorHora[h] || [];
                  const ocupado = reservasEnSlot.length >= (zona.total || 1);
                  const handleClickSlot = () => abrirReserva(h, fechaSlot.toISOString());
                  return (
                    <div key={h} style={{ display: 'flex', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                      <div style={{ width: '50px', flexShrink: 0, padding: '10px 0', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium, textAlign: 'right', paddingRight: '8px' }}>
                        {h}
                      </div>
                      <div style={{ flex: 1, minHeight: '56px', padding: '6px 8px', borderLeft: `1px solid ${theme.colors.borderLight}`, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {reservasEnSlot.length > 0 ? (
                          reservasEnSlot.map((res) => {
                            const esMiReserva = !esGuardiaAdmin && res.nombre?.toLowerCase().includes(nombreUsuario);
                            const clickable = esGuardiaAdmin || esMiReserva;
                            const borderColor = res.estado === 'Aprobado' ? theme.colors.success : res.estado === 'Pendiente' ? theme.colors.warning : theme.colors.secondary;
                            return (
                              <div
                                key={res.id}
                                onClick={() => clickable ? setMenuItem(res) : null}
                                style={{
                                  marginBottom: '3px',
                                  padding: '6px 8px',
                                  borderRadius: theme.radius.md,
                                  background: esGuardiaAdmin || esMiReserva ? `${borderColor}18` : theme.colors.bgMuted,
                                  borderLeft: `3px solid ${borderColor}`,
                                  cursor: esGuardiaAdmin || esMiReserva ? 'pointer' : 'default',
                                  opacity: esGuardiaAdmin || esMiReserva ? 1 : 0.5,
                                }}
                              >
                                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, lineHeight: 1.3 }}>
                                  {esGuardiaAdmin ? `${res.depto} · ${res.nombre}` : (esMiReserva ? `Reserva N°:${res.reservaNum}` : 'Ocupado')}
                                </div>
                                <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, marginTop: '2px' }}>
                                  {res.horario}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <button
                            onClick={handleClickSlot}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%',
                              padding: '8px 8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success, fontWeight: theme.fonts.weights.semibold,
                              background: 'none', border: `1.5px dashed ${theme.colors.border}`, cursor: 'pointer', fontFamily: theme.fonts.family, textAlign: 'center',
                              borderRadius: theme.radius.md, transition: 'background 150ms',
                            }}
                            onMouseEnter={e => { e.target.style.background = '#F0FDF4'; }}
                            onMouseLeave={e => { e.target.style.background = 'none'; }}
                          >
                            + Reservar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Selecciona Hoy, Mañana o un rango de fechas para ver los horarios.</div>
          )}
        </div>

      </div>

      {/* Bottom sheet */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        {esGuardia ? (
          <>
            <BottomSheetOption label="Editar personas en la reserva" onPress={() => abrirEditarPersonas(menuItem)} />
            <BottomSheetOption label="Añadir incidencia" onPress={() => { setIncidenciaItem(menuItem); setIncidenciaTexto(''); setMenuItem(null); setIncidenciaOpen(true); }} />
          </>
        ) : (
          <>
            {rolActivo === 'administrador' && menuItem?.estado === 'Pendiente' && (
              <>
                <BottomSheetOption label="Aprobar reserva" onPress={() => handleEstado('Aprobado')} />
                <BottomSheetOption label="Rechazar reserva" variant="danger" onPress={() => handleEstado('Rechazado')} />
              </>
            )}
            {rolActivo === 'administrador' && (
              <>
                <BottomSheetOption label="Estado: Reservado" onPress={() => handleEstado('Reservado')} />
                <BottomSheetOption label="Estado: Disponible" onPress={() => handleEstado('Disponible')} />
                <BottomSheetOption label="Estado: No disponible" onPress={() => handleEstado('No disponible')} />
              </>
            )}
            <BottomSheetOption
              label="Eliminar"
              variant="danger"
              onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }}
            />
          </>
        )}
      </BottomSheet>

      {/* Editar personas modal */}
      <Modal isOpen={editPersonasOpen} onClose={() => { setEditPersonasOpen(false); setEditPersonasItem(null); }} title="Editar personas en la reserva">
        {editPersonasItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Reservation info */}
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{editPersonasItem.nombre || editPersonasItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{editPersonasItem.reservaNum} · {editPersonasItem.horario}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Total personas: {editPersonasItem.personas?.length || 0}</div>
            </div>

            {/* Person count selector */}
            <SelectField label="Modificar cantidad de personas:" value={String(editPersonasCount)} options={cantidadPersonas} onChange={v => setEditPersonasCount(Number(v.split(' ')[0]))} />

            {/* Person list with check-in, type, and editable names */}
            <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Registro de asistentes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {editPersonasList.map((p, idx) => (
                <div key={idx} style={{
                  ...estilosPersona.container,
                  background: p.llego === true ? theme.colors.successLight : (p.llego === 'salio' ? theme.colors.bgMuted : theme.colors.secondaryLight),
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'stretch',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Editable name */}
                    <input
                      type="text"
                      value={p.nombre}
                      onChange={e => {
                        setEditPersonasList(prev => prev.map((pp, i) => i === idx ? { ...pp, nombre: e.target.value } : pp));
                      }}
                      placeholder={idx === 0 ? 'Nombre del titular' : `Nombre del asistente ${idx + 1}`}
                      style={{
                        flex: 1, padding: '6px 10px', borderRadius: theme.radius.md,
                        border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family, outline: 'none',
                        background: theme.colors.bgCard, color: theme.colors.text,
                      }}
                    />
                    {/* Participant type selector */}
                    <select
                      value={p.tipoParticipante || 'Residente'}
                      onChange={e => setEditPersonasList(prev => prev.map((pp, i) => i === idx ? { ...pp, tipoParticipante: e.target.value } : pp))}
                      style={{
                        padding: '6px 10px', borderRadius: theme.radius.md,
                        border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes['2xs'],
                        fontFamily: theme.fonts.family, outline: 'none',
                        background: theme.colors.bgCard, color: theme.colors.text,
                      }}
                    >
                      {TIPOS_PARTICIPANTE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
                      {idx === 0 ? 'Titular' : `Asistente ${idx + 1}`}
                    </span>
                    {esGuardia ? (
                      /* 3-step slider: Reservado → Llegó → Salió */
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {['Reservado', 'Llegó', 'Salió'].map((paso, pi) => {
                          const estados = [null, true, 'salio'];
                          const activo = p.llego === estados[pi];
                          const colores = ['secondary', 'success', 'textMuted'];
                          return (
                            <button
                              key={paso}
                              type="button"
                              onClick={() => setPersonaLlego(idx, estados[pi])}
                              style={{
                                padding: '4px 10px',
                                borderRadius: theme.radius.full,
                                fontSize: theme.fonts.sizes['2xs'],
                                fontWeight: theme.fonts.weights.semibold,
                                fontFamily: theme.fonts.family,
                                background: activo ? theme.colors[colores[pi]] : theme.colors.bgCard,
                                color: activo ? '#fff' : theme.colors.textSecondary,
                                border: activo ? 'none' : `1px solid ${theme.colors.border}`,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {paso}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Classic Llegó / No llegó */
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setPersonaLlego(idx, true)}
                          style={estilosPersona.botonLlego(p.llego === true)}
                        >
                          Llegó
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonaLlego(idx, false)}
                          style={estilosPersona.botonNoLlego(p.llego === false)}
                        >
                          No llegó
                        </button>
                      </div>
                    )}
                    {/* 2. Reemplazo badge */}
                    {p.reemplazo && (
                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: theme.radius.full, background: '#DBEAFE', color: '#1E40AF', fontWeight: theme.fonts.weights.semibold, marginLeft: '6px' }}>
                        Reemplazo
                      </span>
                    )}
                  </div>
                  {/* 2. Reemplazo input cuando la persona salió */}
                  {esGuardia && p.llego === 'salio' && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={reemplazoInput[idx] || ''}
                        onChange={e => setReemplazoInput(prev => ({ ...prev, [idx]: e.target.value }))}
                        placeholder="Nombre del reemplazo"
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.xs,
                          fontFamily: theme.fonts.family, outline: 'none',
                          background: theme.colors.bgCard, color: theme.colors.text,
                        }}
                      />
                      <button
                        type="button"
                        disabled={!reemplazoInput[idx]?.trim()}
                        onClick={() => {
                          const nombre = reemplazoInput[idx].trim();
                          if (!nombre) return;
                          const lastIdx = editPersonasList.length;
                          setEditPersonasList(prev => [...prev, { nombre, llego: false, tipoParticipante: 'Visitante', reemplazo: true }]);
                          setEditPersonasCount(c => c + 1);
                          setReemplazoInput(prev => ({ ...prev, [idx]: '' }));
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: theme.radius.full,
                          background: reemplazoInput[idx]?.trim() ? theme.colors.success : theme.colors.bgMuted,
                          color: reemplazoInput[idx]?.trim() ? '#fff' : theme.colors.textMuted,
                          border: 'none', cursor: reemplazoInput[idx]?.trim() ? 'pointer' : 'not-allowed',
                          fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes['2xs'],
                          fontWeight: theme.fonts.weights.semibold, whiteSpace: 'nowrap',
                        }}
                      >
                        + Reemplazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button variant="primary" fullWidth onClick={guardarPersonas}>Guardar</Button>
          </div>
        )}
      </Modal>

      {/* Incidencia modal */}
      <Modal isOpen={incidenciaOpen} onClose={() => { setIncidenciaOpen(false); setIncidenciaItem(null); }} title="Registrar comentario o incidencia">
        {incidenciaItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{incidenciaItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{incidenciaItem.reservaNum} · {incidenciaItem.horario}</div>
            </div>
            <textarea
              value={incidenciaTexto}
              onChange={e => setIncidenciaTexto(e.target.value)}
              placeholder="Describa el comentario o incidencia..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`,
                fontSize: theme.fonts.sizes.base,
                fontFamily: theme.fonts.family,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <Button
              variant="primary"
              fullWidth
              disabled={!incidenciaTexto.trim()}
              onClick={() => {
                addToast('Incidencia enviada a PQRs');
                setIncidenciaOpen(false);
                setIncidenciaItem(null);
              }}
            >
              Enviar a PQRs
            </Button>
          </div>
        )}
      </Modal>

      {/* Liberar cupos modal */}
      <Modal isOpen={liberarOpen} onClose={() => { setLiberarOpen(false); setLiberarItem(null); }} title="Liberar cupos">
        {liberarItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{liberarItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{liberarItem.reservaNum} · {liberarItem.horario}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Total personas: {liberarItem.personas?.length || 0}</div>
            </div>
            <SelectField
              label="Cupos a liberar:"
              value={String(liberarCuposInput)}
              options={cantidadPersonas}
              onChange={v => setLiberarCuposInput(Number(v.split(' ')[0]))}
            />
            <Button
              variant="primary"
              fullWidth
              disabled={liberarCuposInput === 0}
              onClick={() => {
                addToast(`${liberarCuposInput} cupo(s) liberado(s)`);
                setLiberarOpen(false);
                setLiberarItem(null);
              }}
            >
              Liberar cupos
            </Button>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar Reserva">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg }}>¿ Seguro que desea eliminar ?</p>
          {deleteItem && (
            <div style={{
              border: `1.5px solid ${theme.colors.primary}`,
              borderRadius: theme.radius.xl,
              padding: '14px',
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: theme.fonts.weights.bold }}>{deleteItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '4px' }}>
                Reserva N°:{deleteItem.reservaNum}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                {deleteItem.horario}
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>

      {/* Reglamento modal */}
      <Modal isOpen={reglamentoOpen} onClose={() => setReglamentoOpen(false)} title="Reglamento de la zona">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{zona.nombre}</div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'pre-wrap' }}>
            {reglamentoTexto}
          </div>
          <Button variant="primary" fullWidth onClick={() => setReglamentoOpen(false)}>Entendido</Button>
        </div>
      </Modal>

      {/* Selector de departamento — Guardia/Admin crean reserva a nombre de un departamento */}
      <Modal isOpen={deptoReservaOpen} onClose={() => setDeptoReservaOpen(false)} title="¿Para qué departamento es la reserva?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SelectField
            label="Departamento"
            value={deptoReserva}
            options={departamentos}
            onChange={setDeptoReserva}
            placeholder="Seleccione el departamento"
          />
          <Button
            variant="primary"
            fullWidth
            disabled={!deptoReserva}
            onClick={confirmarReserva}
          >
            Continuar
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
