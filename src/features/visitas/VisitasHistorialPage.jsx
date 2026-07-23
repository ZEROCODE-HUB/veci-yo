import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Tabs from '../../components/ui/Tabs';
import StatusTabs from '../../components/ui/StatusTabs';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import tipoVisitaIcons from '../../assets/icons/visitas';
import { torres, departamentos } from '../../data/mockData';

const TABS = ['Todas'];

const GUARDIA_TABS = ['Todas'];
const HUESPEDES_TABS = ['Todas', 'Pendiente', 'Aceptado', 'Ingresado'];
const TIPO_TABS = [
  { value: 'visitas', label: 'Visitas' },
  { value: 'huespedes', label: 'Huéspedes' },
];
const TIPOS = ['Todos', 'Amigos Familiares', 'Profesional Temporal', 'Profesional Permanente'];

const TIPO_LABELS = {
  amigos: 'Amigos Familiares',
  temporal: 'Profesional Temporal',
  permanente: 'Profesional Permanente',
  'huesped-temporal': 'Huésped Temporal',
};

export default function VisitasHistorialPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromHome = location.state?.fromHome || false;
  const { visitas, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado, toggleFavoritoInvitado, aprobarInvitado, rolActivo, addToast, verificaciones, actualizarVerificacion, actualizarHoraIngreso, actualizarHoraSalida, setLlegoInvitado, marcarLlegadaConVerificacion, toggleInstruccionCumplida, estacionamientosVisitantes, configHuespedesTemporales, ubicacionActiva, reportarTraSire, usuario, actualizarConfigHuespedTemporal, esResidente } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todas');
  const [tipoTab, setTipoTab] = useState('visitas');
  const [filterOpen, setFilterOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');
  const [deptoFilter, setDeptoFilter] = useState('');
  const [torreFilter, setTorreFilter] = useState('');
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [detalleItem, setDetalleItem] = useState(null);
  const [detalleGuardia, setDetalleGuardia] = useState(null);
  const [verificandoInvitado, setVerificandoInvitado] = useState(null);
  const [capturaStep, setCapturaStep] = useState(null);
  const [verifResultado, setVerifResultado] = useState(null);
  const [verificandoPersona, setVerificandoPersona] = useState(null);
  const [ciInput, setCiInput] = useState('');
  const [ciError, setCiError] = useState('');
  const [traSireModal, setTraSireModal] = useState(null);
  const [guardiaStep1, setGuardiaStep1] = useState(null);
  const [guardiaStep2, setGuardiaStep2] = useState(null);
  const [detallePersonaIdx, setDetallePersonaIdx] = useState(null);
  const [hallazgosPopup, setHallazgosPopup] = useState(null);
  const [selectedTraSire, setSelectedTraSire] = useState([]);
  const [showAsignarEstacionamiento, setShowAsignarEstacionamiento] = useState(false);
  const [parkingSpot, setParkingSpot] = useState('');

  const algunFiltroActivo = search || fechaDesdeFilter || fechaHastaFilter || torreFilter || deptoFilter || tipoFilter !== 'Todos';

  const detalleActual = detalleItem ? visitas.find(v => v.id === detalleItem.id) || null : null;

  const statusForGuardia = (estado) => rolActivo === 'guardia' && estado === 'Rechazado' ? 'Pendiente' : estado;

  const filtered = visitas.filter(v => {
    const estadoVis = statusForGuardia(v.estado);
    const matchTipoGrupo = tipoTab === 'huespedes' ? v.tipo === 'huesped-temporal' : v.tipo !== 'huesped-temporal';
    const matchSearch = !search || v.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todas' || estadoVis === activeTab;
    const matchTipo = tipoFilter === 'Todos' || TIPO_LABELS[v.tipo] === tipoFilter;
    const matchFechaDesde = !fechaDesdeFilter || (v.fechaDesde && v.fechaDesde >= fechaDesdeFilter);
    const matchFechaHasta = !fechaHastaFilter || (v.fechaHasta && v.fechaHasta <= fechaHastaFilter);
    const matchTorre = !torreFilter || v.torre === torreFilter;
    const matchDepto = !deptoFilter || v.depto === deptoFilter;
    const matchGuest = rolActivo !== 'huesped-temporal' || (usuario?.nombre && v.nombre?.toLowerCase().includes(usuario.nombre.toLowerCase().split(' ')[0]));
    return matchTipoGrupo && matchSearch && matchTab && matchTipo && matchFechaDesde && matchFechaHasta && matchTorre && matchDepto && matchGuest;
  });

  const statusTabsForTipo = tipoTab === 'huespedes' ? HUESPEDES_TABS : (rolActivo === 'guardia' ? GUARDIA_TABS : TABS);

  const accesoBloqueado = rolActivo === 'propietario' && !esResidente;

  const handleTipoTabChange = (value) => {
    setTipoTab(value);
    setActiveTab('Todas');
  };

  const handleEstado = (estado) => {
    actualizarEstadoVisita(menuItem.id, estado);
    if (estado === 'Aceptado' && menuItem) {

    }
    setMenuItem(null);
  };

  const handleEliminar = () => {
    eliminarVisita(deleteItem.id);
    setDeleteItem(null);
  };

  return (
    <AppShell>
      {accesoBloqueado ? (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base, marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <p>No tienes acceso a Visitas. Solo los Residentes pueden usar esta función.</p>
          <p style={{ fontSize: theme.fonts.sizes.sm, marginTop: '8px' }}>Si eres Propietario, declárate como Residente desde Configuración.</p>
        </div>
      ) : (<>
      <PageHeader
        title="Visitas"
        onBack={fromHome ? () => navigate('/', { replace: true }) : undefined}
        action={
          <ModuloHeaderInfo
            helpKey="visitas"
            action={
              <button
                onClick={() => navigate('/visitas/nuevo')}
                style={{
                  width: '36px', height: '36px', borderRadius: theme.radius.md,
                  background: theme.colors.primary, color: '#fff', fontSize: '22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', fontWeight: 'bold',
                }}
              >
                +
              </button>
            }
          />
        }
      />

      <ModuloGate helpKey="visitas">
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Type tabs: Visitas / Huéspedes */}
        <Tabs tabs={TIPO_TABS} active={tipoTab} onChange={handleTipoTabChange} centered />
        {/* Filter card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          {tipoTab === 'huespedes' && (
            <div style={{ marginTop: '10px' }}>
              <StatusTabs
                tabs={statusTabsForTipo}
                active={activeTab}
                onChange={tab => setActiveTab(tab || 'Todas')}
                centered
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                background: theme.colors.bgMuted,
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '24px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms, background 200ms',
              }}
              aria-label={filterOpen ? 'Cerrar filtros' : 'Abrir filtros'}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tipoTab !== 'huespedes' && (
                <SelectField label="Categoría" value={tipoFilter === 'Todos' ? '' : tipoFilter} options={TIPOS} onChange={setTipoFilter} />
              )}
              {/* Date filters stacked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, background: theme.colors.bgCard }}>
                    <input
                      type="date"
                      value={fechaDesdeFilter}
                      onChange={e => setFechaDesdeFilter(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        maxWidth: '100%',
                        padding: '11px 14px',
                        border: 'none',
                        fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family,
                        color: theme.colors.text,
                        background: 'transparent',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, background: theme.colors.bgCard }}>
                    <input
                      type="date"
                      value={fechaHastaFilter}
                      onChange={e => setFechaHastaFilter(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        maxWidth: '100%',
                        padding: '11px 14px',
                        border: 'none',
                        fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family,
                        color: theme.colors.text,
                        background: 'transparent',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Direction fields side by side */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Torre</div>
                  <SelectField value={torreFilter} options={['', ...torres]} onChange={setTorreFilter} placeholder="Torre" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Departamento</div>
                  <SelectField value={deptoFilter} options={['', ...departamentos]} onChange={setDeptoFilter} placeholder="Depto" />
                </div>
              </div>
            </div>
          )}
          {algunFiltroActivo && (
            <button
              onClick={() => { setSearch(''); setFechaDesdeFilter(''); setFechaHastaFilter(''); setTorreFilter(''); setDeptoFilter(''); setTipoFilter('Todos'); }}
              style={{
                background: theme.colors.bgMuted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.full,
                padding: '8px 16px',
                fontSize: theme.fonts.sizes.xs,
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                alignSelf: 'center',
                marginTop: '8px',
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* List — guardia: compact person cards */}
        {rolActivo === 'guardia' && filtered.flatMap(item => {
          const persons = item.invitados && item.invitados.length > 0
            ? item.invitados.map((inv, idx) => ({ base: item, persona: inv, idx }))
            : [{ base: item, persona: { nombre: item.nombre, llego: false, horaIngreso: '', horaSalida: '' }, idx: -1 }];
          return persons.map((p, pi) => (
            <div
              key={`${item.id}-${pi}`}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                overflow: 'hidden',
                boxShadow: theme.shadows.card,
              }}
            >
              <div style={{ padding: '14px 16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <img
                    src={tipoVisitaIcons[p.base.tipo]}
                    alt={TIPO_LABELS[p.base.tipo]}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                        {p.persona.nombre}
                      </span>
{p.base.tipo === 'huesped-temporal' && <Badge status={statusForGuardia(p.base.estado)} />}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.base.torre} - {p.base.depto} · {TIPO_LABELS[p.base.tipo] || p.base.tipo}
                    </div>
                  </div>
                </div>
                {p.base.tipo === 'huesped-temporal' && (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '4px' }}>
                    Huésped responsable: {p.base.nombre}
                  </div>
                )}
                {/* Foto extraída del documento con marca de agua (solo Guardia, huésped-temporal) */}
                {p.base.tipo === 'huesped-temporal' && (
                  <div style={{
                    width: '100%', height: '90px', marginTop: '8px',
                    borderRadius: theme.radius.md,
                    background: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <div style={{ fontSize: '8px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                      Foto extraída del documento
                    </div>
                    <div style={{
                      position: 'absolute', bottom: '3px', left: 0, right: 0, textAlign: 'center',
                      fontSize: '8px', color: theme.colors.textMuted, background: 'rgba(255,255,255,0.8)',
                      padding: '1px 3px', transform: 'rotate(-15deg)', letterSpacing: '1px',
                    }}>
                      {usuario?.nombre || 'Roberto Hornado'} · Portería
                    </div>
                  </div>
                )}
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>📅 {p.base.fechaDesde}{p.base.fechaHasta ? ` a ${p.base.fechaHasta}` : ''}</span>
                  {p.persona.horaSalida && (
                    <span style={{
                      fontSize: '9px', padding: '1px 5px', borderRadius: theme.radius.full,
                      background: '#FEF3C7', color: '#92400E', fontWeight: theme.fonts.weights.semibold,
                      display: 'inline-flex', alignItems: 'center', gap: '2px',
                    }}>
                      ⚠ Salida
                    </span>
                  )}
                </div>
                {/* Campos Guardia — no-huésped-temporal */}
                {p.base.tipo !== 'huesped-temporal' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {/* Teléfono del residente solo si "Notificar y anunciar" */}
                    {p.base.tipoNotificacion === 'notificar-y-anunciar' && p.base.telefonoResidente && (
                      <a
                        href={`tel:${p.base.telefonoResidente}`}
                        onClick={e => e.stopPropagation()}
                        style={{ textDecoration: 'none', padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.primaryLight, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.primary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        📞 {p.base.telefonoResidente}
                      </a>
                    )}
                    {/* Vehículo / placa */}
                    {p.base.tieneVehiculo && (
                      <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        🚗 {p.base.vehiculos?.length > 0 ? p.base.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
                      </span>
                    )}
                    {/* DNI para Proveedor Temporal (nunca para amigos) */}
                    {p.base.tipo === 'temporal' && p.base.ci && (
                      <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        🆔 DNI: {p.base.ci}
                      </span>
                    )}
                    {/* Aviso de estacionamiento */}
                    {estacionamientosVisitantes && estacionamientosVisitantes.total > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#F0FDF4' : '#FEF2F2', fontSize: theme.fonts.sizes['2xs'], color: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#166534' : '#991B1B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        🅿️ {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados} libres
                      </span>
                    )}
                  </div>
                )}
                {/* Controles Guardia — huésped-temporal en misma línea */}
                {p.base.tipo === 'huesped-temporal' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}`, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Toggle value={p.persona.llego} onChange={() => setLlegoInvitado(p.base.id, p.idx, !p.persona.llego)} />
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>
                        {p.persona.llego ? 'Llegó' : 'No llegó'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Ingreso</span>
                      <input
                        type="time"
                        value={p.persona.horaIngreso || ''}
                        onChange={e => actualizarHoraIngreso(p.base.id, p.idx, e.target.value)}
                        style={{ width: '120px', padding: '8px 10px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, color: theme.colors.text, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Salida</span>
                      <input
                        type="time"
                        value={p.persona.horaSalida || ''}
                        onChange={e => actualizarHoraSalida(p.base.id, p.idx, e.target.value)}
                        style={{ width: '120px', padding: '8px 10px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, color: theme.colors.text, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }}
                      />
                      {p.persona.horaSalida && (
                        <span
                          onClick={e => { e.stopPropagation(); const nuevaHora = prompt('Ingrese la hora aproximada de salida:'); if (nuevaHora) actualizarHoraSalida(p.base.id, p.idx, nuevaHora); }}
                          style={{ fontSize: '10px', cursor: 'pointer', color: theme.colors.warning, fontWeight: theme.fonts.weights.bold, display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 4px', borderRadius: theme.radius.sm, background: '#FEF3C7' }}
                          title="Hora inexacta"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setDetalleGuardia(p)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: theme.colors.bgMuted,
                  border: 'none',
                  borderTop: `1px solid ${theme.colors.borderLight}`,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.sm,
                  fontWeight: theme.fonts.weights.semibold,
                  color: theme.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Ver detalles →
              </button>
            </div>
          ));
        })}

        {/* List — normal roles: individual cards per person for huesped-temporal */}
        {rolActivo !== 'guardia' && filtered.flatMap(item => {
          if (item.tipo === 'huesped-temporal') {
            const persons = item.invitados && item.invitados.length > 0
              ? item.invitados.map((inv, idx) => ({ base: item, persona: inv, idx }))
              : [{ base: item, persona: { nombre: item.nombre }, idx: -1 }];
            return persons.map((p, pi) => {
              const personStatus = p.idx === -1
                ? p.base.estado
                : p.persona.aprobado === 'rechazado' ? 'Rechazado'
                : p.persona.aprobado === 'pendiente' ? 'Pendiente'
                : p.persona.llego ? 'Ingresado'
                : 'Aceptado';
              const personLabel = ['Pendiente', 'Aceptado'].includes(personStatus) ? `Precheckin: ${personStatus}` : personStatus;
              const hallazgosVerif = p.idx >= 0 && verificaciones[item.id]?.[p.idx]?.estado === 'no-coincide';
              const isSelected = selectedTraSire.includes(`${item.id}-${p.idx}`);
              return (
                <div
                  key={`${item.id}-${pi}`}
                  onClick={() => { setDetalleItem(item); setDetallePersonaIdx(p.idx); }}
                  style={{
                    background: theme.colors.bgCard,
                    borderRadius: theme.radius.xl,
                    padding: '14px 16px',
                    boxShadow: theme.shadows.card,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      {rolActivo !== 'guardia' && (
                        <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedTraSire(prev => {
                                const key = `${item.id}-${p.idx}`;
                                return prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
                              });
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </div>
                      )}
                      <img
                        src={tipoVisitaIcons[item.tipo]}
                        alt={TIPO_LABELS[item.tipo]}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                          {p.persona.nombre}
                        </div>
                        <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px' }}>
                          {item.torre} - {item.depto} · {TIPO_LABELS[item.tipo]}
                        </div>
                        <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>
                          Huésped responsable: {item.nombre}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {hallazgosVerif && (
                        <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.warning, fontWeight: theme.fonts.weights.semibold, background: '#FEF3C7', padding: '2px 6px', borderRadius: theme.radius.full }}>
                          Con hallazgos
                        </span>
                      )}
                      <Badge status={personStatus}>{personLabel}</Badge>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuItem(item); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px' }}
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      <span>{item.fechaDesde} a {item.fechaHasta}</span>
                    </div>
                    {hallazgosVerif && (
                      <button
                        onClick={e => { e.stopPropagation(); setHallazgosPopup({ item, persona: p.persona, idx: p.idx }); }}
                        style={{
                          background: 'none', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.full,
                          padding: '4px 10px', cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                          fontFamily: theme.fonts.family, color: theme.colors.primary,
                        }}
                      >
                        Ver resumen
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          }
          return [(
            <div
              key={item.id}
              onClick={() => setDetalleItem(item)}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '14px 16px',
                boxShadow: theme.shadows.card,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <img
                    src={tipoVisitaIcons[item.tipo]}
                    alt={TIPO_LABELS[item.tipo]}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                      {item.esEvento ? item.nombreEvento : item.nombre}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px' }}>
                      {item.torre} - {item.depto} · {TIPO_LABELS[item.tipo]}
                    </div>
                    {/* DNI solo para Proveedor Temporal (lo ingresó él) */}
                    {item.tipo === 'temporal' && item.ci && (
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                        DNI: {item.ci}
                      </div>
                    )}
                    {item.tipo === 'permanente' && (
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>
                        Registro permanente · {item.diasLaborales || 'Lun – Vie'} · Vigencia: {item.fechaDesde}{item.fechaHasta ? ` a ${item.fechaHasta}` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setMenuItem(item); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px', flexShrink: 0 }}
                >
                  ⋮
                </button>
              </div>

              {/* Chips: notificación + vehículo/placa */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {item.tipoNotificacion && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: '#F3F4F6', fontSize: theme.fonts.sizes['2xs'],
                    color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}>
                    🔔 {item.tipoNotificacion === 'notificar-y-anunciar' ? 'Notificar y anunciar' : 'Notificar'}
                  </span>
                )}
                {item.tieneVehiculo && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'],
                    color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}>
                    🚗 {item.vehiculos?.length > 0 ? item.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
                  </span>
                )}
                <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary }}>
                  📅 {item.fechaDesde}{item.fechaHasta ? ` a ${item.fechaHasta}` : ''}
                </span>
              </div>

              {/* Ingreso / Salida (cuando ocurran) */}
              {item.tipo !== 'permanente' && (item.invitados?.some(inv => inv.horaIngreso) || item.horaIngreso) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  {item.invitados?.length > 0 ? (
                    item.invitados.map((inv, i) => inv.horaIngreso && (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {inv.nombre}: Ingreso {inv.horaIngreso}
                        {inv.horaSalida && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#92400E', background: '#FEF3C7', padding: '1px 5px', borderRadius: theme.radius.full }}>
                            ⚠ Salida {inv.horaSalida}
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    item.horaIngreso && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Ingreso {item.horaIngreso}
                        {item.horaSalida && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#92400E', background: '#FEF3C7', padding: '1px 5px', borderRadius: theme.radius.full }}>
                            ⚠ Salida {item.horaSalida}
                          </span>
                        )}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          )];
        })}

        {/* Bulk TRA/SIRE action */}
        {tipoTab === 'huespedes' && selectedTraSire.length > 0 && (
          <div style={{
            background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px 16px',
            boxShadow: theme.shadows.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              {selectedTraSire.length} seleccionado{selectedTraSire.length > 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedTraSire([])}
                style={{
                  padding: '6px 14px', borderRadius: theme.radius.full,
                  background: theme.colors.bgMuted, border: `1px solid ${theme.colors.border}`,
                  cursor: 'pointer', fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary,
                }}
              >
                Limpiar
              </button>
              <button
                onClick={() => {
                  selectedTraSire.forEach(key => {
                    const [visitaId, invitadoIdx] = key.split('-');
                    const idx = parseInt(invitadoIdx);
                    const visita = visitas.find(v => v.id === parseInt(visitaId));
                    if (visita && visita.invitados[idx] && !visita.invitados[idx].traSireReported) {
                      reportarTraSire(parseInt(visitaId), idx);
                    }
                  });
                  addToast(`Reporte TRA/SIRE enviado para ${selectedTraSire.length} huésped(es)`, 'success');
                  setSelectedTraSire([]);
                }}
                style={{
                  padding: '6px 14px', borderRadius: theme.radius.full,
                  background: theme.colors.secondary, color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                }}
              >
                Reportar TRA/SIRE
              </button>
            </div>
          </div>
        )}

        {/* Row counter */}
        <div style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, padding: '8px 0' }}>
          Mostrando {filtered.length} de {visitas.length} visitas
        </div>
      </div>
      </ModuloGate>

      {/* Edit bottom sheet — acciones según el rol */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        {menuItem?.tipo === 'huesped-temporal' && (
          <BottomSheetOption label="Estado: Aceptado" onPress={() => handleEstado('Aceptado')} />
        )}
        {menuItem?.tipo === 'huesped-temporal' && rolActivo === 'administrador' && (
          <BottomSheetOption label="Estado: Rechazado" onPress={() => handleEstado('Rechazado')} />
        )}
        {menuItem?.tipo === 'huesped-temporal' && (rolActivo === 'propietario' || rolActivo === 'inquilino-lider') && (() => {
          const item = menuItem;
          const invitadosIngresados = item.invitados?.filter(inv => inv.llego)?.length > 0;
          const configLocal = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id] : null;
          const rntCompleto = configLocal?.legal?.rnt?.trim()?.length > 0;
          const puedeReportar = invitadosIngresados && rntCompleto;
          return (
            <BottomSheetOption
              label={puedeReportar ? 'Reportar TRA/SIRE' : 'Reportar TRA/SIRE (completa tu RNT)'}
              variant="primary"
              disabled={!puedeReportar}
              onPress={() => {
                if (!puedeReportar) return;
                setMenuItem(null);
                setTraSireModal(item);
              }}
            />
          );
        })()}
        <BottomSheetOption label="Denunciar / Reportar" variant="primary" onPress={() => { setMenuItem(null); navigate('/perfil/soporte/reclamos/nuevo', { state: { categoriaPreseleccionada: menuItem?.tipo === 'huesped-temporal' ? 'Reporte de huésped' : 'Denuncia entre departamentos', titulo: `Denuncia: ${menuItem?.nombre || ''}`, descripcion: `Reporte desde visitas contra: ${menuItem?.nombre || ''} (CI: ${menuItem?.ci || ''})` } }); }} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
      </BottomSheet>

      {/* Delete modal — mismo estilo que Correspondencia */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar visita">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, textAlign: 'center', color: theme.colors.text }}>
            ¿ Seguro que desea eliminar ?
          </p>
          {deleteItem && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={tipoVisitaIcons[deleteItem.tipo]}
                  alt={TIPO_LABELS[deleteItem.tipo]}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>
                    {deleteItem.esEvento ? deleteItem.nombreEvento : deleteItem.nombre}
                  </div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI: {deleteItem.ci}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                {deleteItem.tipo === 'huesped-temporal' && <Badge status={deleteItem.estado} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  <span>🕐</span>
                  <span>{deleteItem.fechaDesde}</span>
                </div>
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>

      {/* Detail modal — document verification enhanced */}
      <Modal
        isOpen={!!detalleItem}
        onClose={() => { setDetalleItem(null); setDetallePersonaIdx(null); }}
        title={detallePersonaIdx !== null && detallePersonaIdx >= 0 && detalleActual?.invitados[detallePersonaIdx] ? `Huésped: ${detalleActual.invitados[detallePersonaIdx].nombre}` : (detalleActual?.tipo === 'huesped-temporal' ? `Reserva: ${detalleActual?.reserva || ''}` : `Visita: ${detalleItem?.fechaDesde || ''}`)}
      >
        {detalleActual && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={tipoVisitaIcons[detalleActual.tipo]}
                  alt={TIPO_LABELS[detalleActual.tipo]}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>
                    {detallePersonaIdx !== null && detallePersonaIdx >= 0 && detalleActual.invitados[detallePersonaIdx]
                      ? detalleActual.invitados[detallePersonaIdx].nombre
                      : detalleActual.nombre}
                  </div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{detalleActual.torre} - {detalleActual.depto}</div>
                </div>
              </div>

              {/* Parking info */}
              {detalleActual.estacionamientosAsignados > 0 && (
                <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                    🚗 Estacionamientos asignados: {detalleActual.estacionamientosAsignados}
                  </div>
                  {detalleActual.vehiculos?.length > 0 && detalleActual.vehiculos.map((v, i) => (
                    <div key={i} style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🅿️ Vehículo {i + 1}:</span>
                      <span style={{ fontWeight: theme.fonts.weights.medium, color: theme.colors.text }}>{v.placa || 'Sin placa'}</span>
                    </div>
                  ))}
                </div>
              )}

            {/* Invitados list — solo para huésped-temporal (4 bloques) */}
            {detalleActual.tipo === 'huesped-temporal' && detalleActual.invitados.length > 0 && (
              <div>
                {!(detallePersonaIdx !== null && detalleActual.tipo === 'huesped-temporal') && (
                  <p style={{ fontWeight: theme.fonts.weights.bold, textDecoration: 'underline', marginBottom: '10px' }}>Huéspedes:</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(detallePersonaIdx !== null && detalleActual.tipo === 'huesped-temporal'
                    ? [detalleActual.invitados[detallePersonaIdx]].map((inv, _i) => ({ ...{ inv, i: detallePersonaIdx } }))
                    : detalleActual.invitados.map((inv, i) => ({ inv, i }))
                  ).map(({ inv, i }) => {
                    const esHuespedTemp = detalleActual.tipo === 'huesped-temporal';
                    const verif = esHuespedTemp ? verificaciones[detalleActual.id]?.[i] : null;
                    const esGuardia = rolActivo === 'guardia';
                    const esAdmin = rolActivo === 'administrador';
                    const esAnfitrion = rolActivo === 'propietario' || rolActivo === 'inquilino-lider';
                    const puedeVerVerificacion = (esAdmin || esAnfitrion) && esHuespedTemp && verif;
                    const puedeVerificar = esGuardia && esHuespedTemp;
                    const docLabels = {
                      'cedula-anverso': { label: 'Cédula (anv.)' },
                      'cedula-reverso': { label: 'Cédula (rev.)' },
                      'pasaporte': { label: 'Pasaporte' },
                      'tutela': { label: 'Tutela' },
                    };
                    return (
                      <div key={i} style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => toggleFavoritoInvitado(detalleActual.id, i)}
                              aria-label={inv.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill={inv.favorito ? theme.colors.primary : 'none'} stroke={inv.favorito ? theme.colors.primary : theme.colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                            </button>
                            <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base }}>{inv.nombre}</span>
                          </div>
                        </div>

                        {/* Block 1 — Precheckin */}
                        <div style={{ padding: '10px', background: theme.colors.bgCard, borderRadius: theme.radius.md, marginBottom: '8px' }}>
                          <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '6px' }}>1. Precheckin</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Badge status={inv.aprobado === 'aprobado' ? 'Aceptado' : (inv.aprobado === 'rechazado' ? 'Rechazado' : 'Pendiente')}>
                              {inv.aprobado === 'aprobado' ? 'Precheckin: Aceptado' : (inv.aprobado === 'rechazado' ? 'Rechazado' : 'Precheckin: Pendiente')}
                            </Badge>
                            {inv.aprobado === 'pendiente' && (esAdmin || esAnfitrion) && (
                              <button
                                onClick={() => aprobarInvitado(detalleActual.id, i, 'aprobado')}
                                style={{
                                  padding: '6px 14px', borderRadius: theme.radius.full,
                                  background: theme.colors.success, color: '#fff', border: 'none',
                                  cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                                  fontWeight: theme.fonts.weights.semibold, fontFamily: theme.fonts.family,
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Aprobar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Block 2 — Ingreso al condominio */}
                        <div style={{ padding: '10px', background: theme.colors.bgCard, borderRadius: theme.radius.md, marginBottom: '8px' }}>
                          <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '6px' }}>2. Ingreso al condominio</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Badge status={inv.llego ? 'Ingresado' : 'Pendiente'} />
                            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                              {inv.llego ? 'Ingresó' : 'No ingresado'}
                            </span>
                          </div>
                        </div>

                        {/* Block 3 — Verificación de documento */}
                        <div style={{ padding: '10px', background: theme.colors.bgCard, borderRadius: theme.radius.md, marginBottom: '8px' }}>
                          <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '6px' }}>3. Verificación de documento</div>
                          {verif ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <Badge status={verif.estado === 'verificado' ? 'Verificado' : (verif.estado === 'no-coincide' ? 'No coincide' : 'Pendiente')} />
                              {verif.fechaVerificacion && (
                                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>{verif.fechaVerificacion}</span>
                              )}
                              {verif.documentoTomado && (
                                <button
                                  onClick={undefined}
                                  style={{
                                    padding: '4px 10px', borderRadius: theme.radius.full,
                                    background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
                                    cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                                    fontFamily: theme.fonts.family, color: theme.colors.text,
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                    <circle cx="12" cy="13" r="4"/>
                                  </svg>
                                  Doc. Ingreso
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Badge status="Pendiente" />
                              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>No verificado</span>
                            </div>
                          )}
                          {inv.documentos && inv.documentos.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginRight: '2px', alignSelf: 'center' }}>📄</span>
                              {inv.documentos.map((doc, di) => {
                                const info = docLabels[doc] || { label: doc };
                                return (
                                  <button
                                    key={di}
                                    onClick={undefined}
                                    style={{
                                      padding: '4px 10px', borderRadius: theme.radius.full,
                                      background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
                                      cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                                      fontFamily: theme.fonts.family, color: theme.colors.text,
                                      display: 'flex', alignItems: 'center', gap: '4px',
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                      <polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    {info.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Block 4 — TRA/SIRE */}
                        <div style={{ padding: '10px', background: theme.colors.bgCard, borderRadius: theme.radius.md }}>
                          <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '6px' }}>4. TRA/SIRE</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {inv.traSireReported ? (
                              <>
                                <Badge status="Aceptado" />
                                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reportado</span>
                              </>
                            ) : (
                              <>
                                <Badge status="Pendiente" />
                                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>No reportado</span>
                                {inv.llego && (rolActivo === 'propietario' || rolActivo === 'inquilino-lider') && (() => {
                                  const rntCompleto = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id]?.legal?.rnt?.trim()?.length > 0 : false;
                                  return (
                                    <button
                                      onClick={() => {
                                        if (!rntCompleto) {
                                          addToast('Completa tu RNT en la configuración de Huéspedes Temporales', 'warning');
                                          return;
                                        }
                                        reportarTraSire(detalleActual.id, i);
                                        addToast('Reporte TRA/SIRE enviado exitosamente', 'success');
                                      }}
                                      style={{
                                        padding: '6px 14px', borderRadius: theme.radius.full,
                                        background: theme.colors.secondary, color: '#fff', border: 'none',
                                        cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                                        fontWeight: theme.fonts.weights.semibold, fontFamily: theme.fonts.family,
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                      </svg>
                                      {rntCompleto ? 'Reportar TRA/SIRE' : 'Reportar TRA/SIRE (completa tu RNT)'}
                                    </button>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Minor alert for minors without tutela */}
                        {esHuespedTemp && inv.esMenor && !inv.tieneTutela && (
                          <div style={{ padding: '8px 12px', marginTop: '8px', background: '#FFF8E1', borderRadius: theme.radius.md, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span style={{ fontSize: theme.fonts.sizes.xs, color: '#8D6E00' }}>
                              Este huésped no está en capacidad de aceptar los Términos y Condiciones
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cuerpo visitas normales (no-huésped-temporal) — vista Propietario/Anfitrión */}
            {detalleActual.tipo !== 'huesped-temporal' && (() => {
              const tipo = detalleActual.tipo;
              const notificacionLabel = detalleActual.tipoNotificacion === 'notificar-y-anunciar' ? 'Notificar y anunciar' : 'Notificar';
              const personas = detalleActual.invitados && detalleActual.invitados.length > 0
                ? detalleActual.invitados
                : [{ nombre: detalleActual.nombre, horaIngreso: detalleActual.horaIngreso, horaSalida: detalleActual.horaSalida }];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tipo === 'permanente' && (
                    <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>Registro permanente</div>
                      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{detalleActual.diasLaborales || 'Sin días laborales asignados'}</div>
                    </div>
                  )}
                  {personas.map((inv, i) => (
                    <div key={i} style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
                      <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base }}>{inv.nombre}</div>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                        📅 {detalleActual.fechaDesde}{detalleActual.fechaHasta ? ` a ${detalleActual.fechaHasta}` : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: '#F3F4F6', fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          🔔 {notificacionLabel}
                        </span>
                        {detalleActual.tieneVehiculo && (
                          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgCard, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🚗 {detalleActual.vehiculos?.length > 0 ? detalleActual.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
                          </span>
                        )}
                        {/* DNI solo para Proveedor Temporal (lo ingresó él) */}
                        {tipo === 'temporal' && detalleActual.ci && (
                          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgCard, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🆔 DNI: {detalleActual.ci}
                          </span>
                        )}
                      </div>
                      {/* Ingreso / Salida — solo para amigos y temporal (no para permanente) */}
                      {tipo !== 'permanente' && inv.horaIngreso && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Ingreso: {inv.horaIngreso}
                          </span>
                          {inv.horaSalida && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#92400E', background: '#FEF3C7', padding: '1px 6px', borderRadius: theme.radius.full }}>
                              ⚠ Salida: {inv.horaSalida} (inexacta)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Tutela - solo para Admin y Guardia si es menor de edad */}
            {detalleActual.esMenor && detalleActual.tieneTutela && (rolActivo === 'administrador' || rolActivo === 'guardia') && (
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.xl, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Documento de Tutela</span>
                </div>
                <button
                  type="button"
                  onClick={undefined}
                  style={{
                    padding: '6px 14px',
                    borderRadius: theme.radius.full,
                    background: theme.colors.secondary,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: theme.fonts.sizes.xs,
                    fontWeight: theme.fonts.weights.semibold,
                    fontFamily: theme.fonts.family,
                  }}
                >
                  Descargar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Verification camera modal — for Guardia (huesped-temporal) */}
      <Modal
        isOpen={!!verificandoInvitado && capturaStep === null}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Verificar documento"
      >
        {verificandoInvitado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Saved document from database — reference for comparison */}
            {verificandoInvitado.documentos?.length > 0 && (
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 12px' }}>
                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '6px' }}>
                  Documento registrado en base de datos:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {verificandoInvitado.documentos.map((doc, di) => {
                    const docLabels = {
                      'cedula-anverso': 'Cédula (anv.)',
                      'cedula-reverso': 'Cédula (rev.)',
                      'pasaporte': 'Pasaporte',
                      'tutela': 'Tutela',
                    };
                    return (
                      <div key={di} style={{
                        padding: '6px 10px', borderRadius: theme.radius.md,
                        background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
                        fontSize: theme.fonts.sizes.xs, color: theme.colors.text,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {docLabels[doc] || doc}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Camera capture area */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '140px', height: '140px', margin: '0 auto',
                borderRadius: theme.radius.xl,
                background: theme.colors.bgMuted,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                border: `2px dashed ${theme.colors.border}`,
                fontSize: '48px', color: theme.colors.textMuted,
              }}>
                📷
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: '8px 0 0' }}>
                Capture una foto del documento presentado por <strong>{verificandoInvitado.nombre}</strong> para compararlo visualmente con el documento registrado
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setCapturaStep('capturando');
                  setTimeout(() => {
                    setCapturaStep('verificando');
                    setTimeout(() => {
                      const resultado = Math.random();
                      let estado, mensaje;
                      if (resultado > 0.6) {
                        estado = 'verificado';
                        mensaje = 'Documento verificado correctamente';
                      } else if (resultado > 0.3) {
                        estado = 'no-coincide';
                        mensaje = 'Documento no coincide';
                      } else {
                        estado = 'fallido';
                        mensaje = 'Verificación fallida';
                      }
                      setVerifResultado({ estado, mensaje });
                      actualizarVerificacion(verificandoInvitado.visitaId, verificandoInvitado.invitadoIdx, {
                        estado,
                        documentoTomado: '/mock/captured-doc.jpg',
                        fechaVerificacion: new Date().toLocaleDateString('es-AR'),
                        verificadoPor: 'Roberto Hornado',
                      });
                      setCapturaStep('resultado');
                    }, 1500);
                  }, 1000);
                }}
              >
                Capturar fotografía
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Verification progress modal */}
      <Modal
        isOpen={capturaStep === 'capturando' || capturaStep === 'verificando'}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Verificando documento"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
          {capturaStep === 'capturando' && (
            <>
              <div style={{ fontSize: '48px', animation: 'pulse 1s infinite' }}>📸</div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Capturando imagen...</p>
            </>
          )}
          {capturaStep === 'verificando' && (
            <>
              <div style={{ fontSize: '48px', animation: 'pulse 1s infinite' }}>🔄</div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Comparando documento capturado con el registrado en base de datos...</p>
            </>
          )}
        </div>
      </Modal>

      {/* Verification result modal */}
      <Modal
        isOpen={capturaStep === 'resultado' && !!verifResultado}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Resultado de verificación"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          {verifResultado?.estado === 'verificado' && (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.success, fontWeight: theme.fonts.weights.semibold, margin: 0 }}>
                {verifResultado.mensaje}
              </p>
            </>
          )}
          {verifResultado?.estado === 'no-coincide' && (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.dangerLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.danger} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.danger, fontWeight: theme.fonts.weights.semibold, margin: 0 }}>
                {verifResultado.mensaje}
              </p>
            </>
          )}
          {verifResultado?.estado === 'fallido' && (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.warning} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.warning, fontWeight: theme.fonts.weights.semibold, margin: 0 }}>
                {verifResultado.mensaje}
              </p>
            </>
          )}
          <Button variant="primary" fullWidth onClick={() => {
            if (verifResultado?.estado === 'verificado' && verificandoInvitado) {
              setGuardiaStep2(`${verificandoInvitado.visitaId}-${verificandoInvitado.invitadoIdx}`);
            }
            setVerificandoInvitado(null);
            setCapturaStep(null);
            setVerifResultado(null);
          }}>
            {verifResultado?.estado === 'verificado' ? 'Continuar' : 'Cerrar'}
          </Button>
        </div>
      </Modal>

      {/* Guardia detail modal */}
      <Modal
        isOpen={!!detalleGuardia}
        onClose={() => setDetalleGuardia(null)}
        title={detalleGuardia?.base?.nombre || ''}
      >
        {detalleGuardia && (() => {
          const p = detalleGuardia;
          const esVerificacionObligatoria = p.base.tipo !== 'amigos' || p.base.instruccionDocumento === 'verificar';
          const cumplidas = p.base.instruccionesCumplidas || {};
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={tipoVisitaIcons[p.base.tipo]}
                  alt={TIPO_LABELS[p.base.tipo]}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{p.persona.nombre}</div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{p.base.torre} - {p.base.depto} · {TIPO_LABELS[p.base.tipo]}</div>
                </div>
                {p.base.tipo === 'huesped-temporal' && <Badge status={statusForGuardia(p.base.estado)} />}
              </div>

              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>📅 {p.base.fechaDesde}{p.base.fechaHasta ? ` a ${p.base.fechaHasta}` : ''}</span>
              </div>

              {/* Compact block: instrucción, notificación, vehículo, estacionamiento — una línea cada uno */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 0' }}>
                {p.base.instruccionDocumento && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: p.base.instruccionDocumento === 'verificar' ? '#FEF3C7' : '#DBEAFE',
                    fontSize: theme.fonts.sizes['2xs'], color: p.base.instruccionDocumento === 'verificar' ? '#92400E' : '#1E40AF',
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.base.instruccionDocumento === 'verificar' ? '🆔 Verificar' : '🔓 No verificar'}
                  </span>
                )}
                {p.base.tipoNotificacion && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: '#F3F4F6',
                    fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary,
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    🔔 {p.base.tipoNotificacion === 'notificar-y-anunciar' ? 'Anunciar' : 'Notificar'}
                  </span>
                )}
                <span style={{
                  padding: '2px 8px', borderRadius: theme.radius.full,
                  background: theme.colors.bgMuted,
                  fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary,
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  whiteSpace: 'nowrap',
                }}>
                  🚗 {p.base.tieneVehiculo ? `Con vehículo${p.base.vehiculos?.length > 0 ? ` (${p.base.vehiculos.map(v => v.placa).filter(Boolean).join(',')})` : ''}` : 'Sin vehículo'}
                </span>
                {estacionamientosVisitantes && estacionamientosVisitantes.total > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#F0FDF4' : '#FEF2F2',
                    fontSize: theme.fonts.sizes['2xs'],
                    color: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#166534' : '#991B1B',
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    🅿️ {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados} libres
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '8px 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                {/* Verificación de cédula — automática al validar el documento (solo Proveedor Temporal) */}
                {p.base.tipo === 'temporal' && (
                  p.persona.ciVerificado ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success, fontWeight: theme.fonts.weights.semibold }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Cédula verificada
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setVerificandoPersona({ ...p, esObligatoria: esVerificacionObligatoria });
                        setCiInput('');
                        setCiError('');
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: theme.radius.full,
                        background: '#FEF3C7', color: '#92400E', border: 'none',
                        cursor: 'pointer', fontFamily: theme.fonts.family,
                        fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                      }}
                    >
                      🆔 Verificar cédula
                    </button>
                  )
                )}
                {/* Llamé / No lo anuncié — único checkbox manual del Guardia */}
                <label
                  onClick={() => toggleInstruccionCumplida(p.base.id, 'llamoAnuncie')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '4px 0',
                    fontSize: theme.fonts.sizes.xs,
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.family,
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `2px solid ${cumplidas.llamoAnuncie ? theme.colors.success : theme.colors.border}`,
                    background: cumplidas.llamoAnuncie ? theme.colors.success : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 150ms',
                  }}>
                    {cumplidas.llamoAnuncie && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  Llamé / No lo anuncié
                </label>
              </div>

              {/* 2-step flow for huesped-temporal (guardia) */}
              {p.base.tipo === 'huesped-temporal' && !p.persona.llego && (
                <div style={{
                  padding: '12px 0',
                  borderTop: `1px solid ${theme.colors.borderLight}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  {/* Step 1: Physical appearance check */}
                  <div style={{
                    background: guardiaStep1 === `${p.base.id}-${p.idx}` ? '#F0FDF4' : theme.colors.bgMuted,
                    borderRadius: theme.radius.lg,
                    padding: '12px',
                    border: `1.5px solid ${guardiaStep1 === `${p.base.id}-${p.idx}` ? theme.colors.success : theme.colors.border}`,
                  }}>
                    <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '8px' }}>
                      Paso 1 — Verificar apariencia física
                    </div>
                    <div style={{
                      width: '100%', height: '120px',
                      borderRadius: theme.radius.md,
                      background: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: '4px',
                      border: `1px solid ${theme.colors.border}`,
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <div style={{ fontSize: '9px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                        Foto extraída del documento
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '4px', left: 0, right: 0,
                        textAlign: 'center',
                        fontSize: '9px',
                        color: theme.colors.textMuted,
                        background: 'rgba(255,255,255,0.8)',
                        padding: '2px 4px',
                        transform: 'rotate(-15deg)',
                        letterSpacing: '1px',
                      }}>
                        {usuario?.nombre || 'Roberto Hornado'} · Portería
                      </div>
                    </div>
                    {guardiaStep1 === `${p.base.id}-${p.idx}` ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Coincide apariencia física
                      </div>
                    ) : (
                      <button
                        onClick={() => setGuardiaStep1(`${p.base.id}-${p.idx}`)}
                        style={{
                          width: '100%', padding: '8px', borderRadius: theme.radius.full,
                          background: theme.colors.primary, color: '#fff', border: 'none',
                          cursor: 'pointer', fontFamily: theme.fonts.family,
                          fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                        }}
                      >
                        Coincide apariencia física
                      </button>
                    )}
                  </div>

                  {/* Step 2: Document scan */}
                  <div style={{
                    background: guardiaStep2 === `${p.base.id}-${p.idx}` ? '#F0FDF4' : theme.colors.bgMuted,
                    borderRadius: theme.radius.lg,
                    padding: '12px',
                    border: `1.5px solid ${guardiaStep2 === `${p.base.id}-${p.idx}` ? theme.colors.success : theme.colors.border}`,
                    opacity: !guardiaStep1 ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '8px' }}>
                      Paso 2 — Escanear documento físico
                    </div>
                    {guardiaStep2 === `${p.base.id}-${p.idx}` ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Documento verificado correctamente
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!guardiaStep1) return;
                          setVerificandoInvitado({ visitaId: p.base.id, invitadoIdx: p.idx, nombre: p.persona.nombre, documentos: p.persona.documentos || [] });
                        }}
                        disabled={!guardiaStep1}
                        style={{
                          width: '100%', padding: '8px', borderRadius: theme.radius.full,
                          background: guardiaStep1 ? theme.colors.secondary : theme.colors.bgMuted,
                          color: guardiaStep1 ? '#fff' : theme.colors.textMuted,
                          border: 'none', cursor: guardiaStep1 ? 'pointer' : 'not-allowed',
                          fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.xs,
                          fontWeight: theme.fonts.weights.semibold,
                        }}
                      >
                        📷 Escanear documento
                      </button>
                    )}
                  </div>

                  {/* Mark arrived — enabled only after both steps */}
                  {guardiaStep1 && guardiaStep2 && (
                    <button
                      onClick={() => {
                        setLlegoInvitado(p.base.id, p.idx, true);
                        actualizarHoraIngreso(p.base.id, p.idx, new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
                        setGuardiaStep1(null);
                        setGuardiaStep2(null);
                      }}
                      style={{
                        width: '100%', padding: '12px', borderRadius: theme.radius.full,
                        background: theme.colors.success, color: '#fff', border: 'none',
                        cursor: 'pointer', fontFamily: theme.fonts.family,
                        fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold,
                      }}
                    >
                      Marcar ingreso — Llegó
                    </button>
                  )}
                </div>
              )}

              {/* Arrival toggle — always visible for guardia */}
              <div style={{
                padding: '8px 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Toggle value={p.persona.llego}                     onChange={() => {
                      if (p.base.tipo === 'huesped-temporal') {
                        setLlegoInvitado(p.base.id, p.idx, !p.persona.llego);
                        } else if (!p.persona.llego && p.base.tipo === 'temporal' && !p.persona.ciVerificado) {
                          addToast('Debes verificar la cédula (validar el documento) antes de registrar el ingreso', 'warning');
                      } else if (!p.persona.llego && esVerificacionObligatoria && p.base.ci && !p.persona.ciVerificado) {
                        setVerificandoPersona({ ...p, esObligatoria: true });
                        setCiInput('');
                        setCiError('');
                      } else if (!p.persona.llego && !esVerificacionObligatoria && p.base.ci && !p.persona.ciVerificado) {
                        setVerificandoPersona({ ...p, esObligatoria: false });
                        setCiInput('');
                        setCiError('');
                      } else {
                        setLlegoInvitado(p.base.id, p.idx, !p.persona.llego);
                      }
                    }} />
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>
                      {p.persona.llego ? 'Llegó' : 'No llegó'}
                    </span>
                  </div>
                  {p.base.ci && p.persona.llego && p.persona.ciVerificado && (
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.success, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                      ✓ Identidad verificada
                    </span>
                  )}
                  {p.base.tipo !== 'huesped-temporal' && p.base.tipo !== 'temporal' && p.base.ci && !p.persona.llego && (
                    <button
                      onClick={() => {
                        setVerificandoPersona({ ...p, esObligatoria: esVerificacionObligatoria });
                        setCiInput('');
                        setCiError('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: theme.colors.primary,
                        fontSize: theme.fonts.sizes.xs,
                        cursor: 'pointer',
                        fontFamily: theme.fonts.family,
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Verificar
                    </button>
                  )}
                  {p.base.tipo !== 'huesped-temporal' && (
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Ingreso</span>
                      <input
                        type="time"
                        value={p.persona.horaIngreso || ''}
                        onChange={e => actualizarHoraIngreso(p.base.id, p.idx, e.target.value)}
                        style={{
                          width: '110px',
                          padding: '8px 10px',
                          borderRadius: theme.radius.md,
                          border: `1.5px solid ${theme.colors.border}`,
                          fontSize: theme.fonts.sizes.sm,
                          fontFamily: theme.fonts.family,
                          color: theme.colors.text,
                          background: theme.colors.bgMuted,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Salida</span>
                      <input
                        type="time"
                        value={p.persona.horaSalida || ''}
                        onChange={e => actualizarHoraSalida(p.base.id, p.idx, e.target.value)}
                        style={{
                          width: '110px',
                          padding: '8px 10px',
                          borderRadius: theme.radius.md,
                          border: `1.5px solid ${theme.colors.border}`,
                          fontSize: theme.fonts.sizes.sm,
                          fontFamily: theme.fonts.family,
                          color: theme.colors.text,
                          background: theme.colors.bgMuted,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {p.persona.horaSalida && (
                        <span
                          onClick={() => {
                            const nuevaHora = prompt('Ingrese la hora aproximada de salida:');
                            if (nuevaHora) actualizarHoraSalida(p.base.id, p.idx, nuevaHora);
                          }}
                          style={{
                            fontSize: '10px', cursor: 'pointer',
                            color: theme.colors.warning, fontWeight: theme.fonts.weights.bold,
                            display: 'inline-flex', alignItems: 'center', gap: '2px',
                            padding: '2px 4px', borderRadius: theme.radius.sm,
                            background: '#FEF3C7',
                          }}
                          title="Hora inexacta"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </div>

              {/* Acciones Guardia — visitas normales (no-huésped-temporal) */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 0 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                {/* Salió */}
                <button
                  onClick={() => {
                    if (!p.persona.llego) {
                      addToast('El visitante aún no ingresó', 'warning');
                      return;
                    }
                    if (p.persona.horaSalida) {
                      addToast('La salida ya fue registrada', 'info');
                      return;
                    }
                    actualizarHoraSalida(p.base.id, p.idx, new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
                    addToast('Salida registrada (hora aproximada)', 'success');
                  }}
                  style={{
                    flex: '1 1 auto', minWidth: '120px', padding: '10px', borderRadius: theme.radius.full,
                    background: p.persona.horaSalida ? theme.colors.bgMuted : '#FEF3C7',
                    color: p.persona.horaSalida ? theme.colors.textMuted : '#92400E',
                    border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  🚪 {p.persona.horaSalida ? `Salió ${p.persona.horaSalida} (aprox.)` : 'Salió'}
                </button>
                {/* Asignar estacionamiento */}
                <button
                  onClick={() => { setParkingSpot(''); setShowAsignarEstacionamiento(true); }}
                  style={{
                    flex: '1 1 auto', minWidth: '120px', padding: '10px', borderRadius: theme.radius.full,
                    background: theme.colors.bgMuted, color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`, cursor: 'pointer', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  🅿️ Asignar estacionamiento
                </button>
                {/* Llamar / Anunciar */}
                {p.base.tipoNotificacion === 'notificar-y-anunciar' && (
                  <button
                    onClick={() => {
                      if (p.base.telefonoResidente) {
                        window.location.href = `tel:${p.base.telefonoResidente}`;
                      }
                      addToast(`Anunciado: ${p.persona.nombre} en ${p.base.torre}-${p.base.depto}`, 'info');
                    }}
                    style={{
                      flex: '1 1 auto', minWidth: '120px', padding: '10px', borderRadius: theme.radius.full,
                      background: theme.colors.primary, color: '#fff', border: 'none',
                      cursor: 'pointer', fontFamily: theme.fonts.family,
                      fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    📞 Llamar / Anunciar
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Asignar estacionamiento modal — Guardia */}
      <Modal isOpen={showAsignarEstacionamiento} onClose={() => setShowAsignarEstacionamiento(false)} title="Asignar estacionamiento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
            Asigne un cupo disponible al visitante
          </div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
            Visitante: <strong>{detalleGuardia ? `${detalleGuardia.persona.nombre} (${detalleGuardia.base.torre}-${detalleGuardia.base.depto})` : ''}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {Array.from({ length: estacionamientosVisitantes?.total || 20 }, (_, i) => {
              const spot = `B${String(i + 1).padStart(2, '0')}`;
              const libre = estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total;
              return (
                <button
                  key={spot}
                  onClick={() => setParkingSpot(spot)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: theme.radius.lg,
                    border: `2px solid ${parkingSpot === spot ? theme.colors.primary : theme.colors.border}`,
                    background: parkingSpot === spot ? theme.colors.primaryLight : theme.colors.bgMuted,
                    cursor: 'pointer', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.sm, color: theme.colors.text,
                  }}
                >
                  <span style={{ fontWeight: theme.fonts.weights.bold }}>{spot}</span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                    {parkingSpot === spot ? 'Seleccionado' : (libre ? 'Disponible' : 'Sin cupos libres')}
                  </span>
                </button>
              );
            })}
          </div>
          <Button variant="primary" fullWidth disabled={!parkingSpot} onClick={() => {
            if (parkingSpot && estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total) {
              actualizarEstacionamientosVisitantes({ ocupados: estacionamientosVisitantes.ocupados + 1 });
              addToast(`Estacionamiento ${parkingSpot} asignado a ${detalleGuardia?.persona.nombre}`, 'success');
            } else {
              addToast('No hay cupos libres', 'warning');
            }
            setShowAsignarEstacionamiento(false);
            setParkingSpot('');
          }}>
            Confirmar asignación
          </Button>
        </div>
      </Modal>

      {/* Identity verification modal — for guardia */}
      <Modal
        isOpen={!!verificandoPersona}
        onClose={() => setVerificandoPersona(null)}
        title="Verificar identidad"
      >
        {verificandoPersona && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
              🆔
            </div>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
              Ingrese el número de identificación de <strong>{verificandoPersona.persona.nombre}</strong>
            </p>
            <div style={{ width: '100%' }}>
              <input
                type="text"
                value={ciInput}
                onChange={e => { setCiInput(e.target.value); setCiError(''); }}
                placeholder="Número de identificación"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: theme.radius.lg,
                  border: `1.5px solid ${ciError ? theme.colors.danger : theme.colors.border}`,
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                  background: theme.colors.bgCard,
                  outline: 'none',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}
              />
              {ciError && (
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, marginTop: '6px' }}>{ciError}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              {!verificandoPersona.esObligatoria && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setLlegoInvitado(verificandoPersona.base.id, verificandoPersona.idx, true);
                    setVerificandoPersona(null);
                    setCiInput('');
                    setCiError('');
                  }}
                >
                  Saltar verificación
                </Button>
              )}
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  if (ciInput.trim() === verificandoPersona.base.ci) {
                    marcarLlegadaConVerificacion(verificandoPersona.base.id, verificandoPersona.idx);
                    setVerificandoPersona(null);
                    setCiInput('');
                    setCiError('');
                  } else {
                    setCiError('El número de identificación no coincide con el registrado');
                  }
                }}
              >
                Verificar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* TRA/SIRE confirmation modal */}
      <Modal
        isOpen={!!traSireModal}
        onClose={() => setTraSireModal(null)}
        title="Reportar TRA/SIRE"
      >
        {traSireModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
              Se reportarán los siguientes huéspedes a TRA y SIRE:
            </div>
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {traSireModal.invitados?.filter(inv => inv.llego).map((inv, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{inv.nombre}</span>
                  {inv.traSireReported && (
                    <Badge status="Aceptado" />
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 1.5, background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px' }}>
              Los datos se enviarán con la información ya registrada del huésped. No se requiere captura adicional. Sin costo adicional.
            </div>
            <Button variant="primary" fullWidth onClick={() => {
              if (traSireModal) {
                traSireModal.invitados?.forEach((inv, idx) => {
                  if (inv.llego && !inv.traSireReported) {
                    reportarTraSire(traSireModal.id, idx);
                  }
                });
                addToast('Reporte TRA/SIRE enviado exitosamente', 'success');
              }
              setTraSireModal(null);
            }}>
              Ejecutar
            </Button>
          </div>
        )}
      </Modal>

      {/* Hallazgos summary popup */}
      <Modal isOpen={!!hallazgosPopup} onClose={() => setHallazgosPopup(null)} title="Resumen de verificación">
        {hallazgosPopup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                {hallazgosPopup.persona.nombre}
              </span>
            </div>
            <div style={{ background: '#FEF3C7', borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.sm, color: '#92400E', lineHeight: 1.5 }}>
              <strong>Hallazgos detectados:</strong> El documento no coincide con el registro en base de datos. Se recomienda verificar físicamente el documento presentado.
            </div>
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>Detalles de la verificación</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                Estado: No coincide
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                Fecha: {verificaciones[hallazgosPopup.item.id]?.[hallazgosPopup.idx]?.fechaVerificacion || 'N/A'}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                Verificado por: {verificaciones[hallazgosPopup.item.id]?.[hallazgosPopup.idx]?.verificadoPor || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      </>)}
    </AppShell>
  );
}
