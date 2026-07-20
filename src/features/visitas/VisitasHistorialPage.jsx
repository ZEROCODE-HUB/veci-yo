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
const TIPOS = ['Todos', 'Amigos Familiares', 'Profesional Temporal', 'Profesional Permanente', 'Huésped Temporal'];

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
  const { visitas, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado, toggleFavoritoInvitado, aprobarInvitado, rolActivo, addToast, verificaciones, actualizarVerificacion, actualizarHoraIngreso, actualizarHoraSalida, setLlegoInvitado, marcarLlegadaConVerificacion, toggleInstruccionCumplida, estacionamientosVisitantes, configHuespedesTemporales, ubicacionActiva, reportarTraSire, usuario } = useApp();
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
    return matchTipoGrupo && matchSearch && matchTab && matchTipo && matchFechaDesde && matchFechaHasta && matchTorre && matchDepto;
  });

  const statusTabsForTipo = tipoTab === 'huespedes' ? HUESPEDES_TABS : (rolActivo === 'guardia' ? GUARDIA_TABS : TABS);

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
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>📅 {p.base.fechaDesde}{p.base.fechaHasta ? ` a ${p.base.fechaHasta}` : ''}</span>
                </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <img
                    src={tipoVisitaIcons[item.tipo]}
                    alt={TIPO_LABELS[item.tipo]}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                      {item.esEvento ? item.nombreEvento : item.nombre}
                    </div>
                    {item.ci && (
                      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                        CI:{item.ci}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                {item.tipo === 'huesped-temporal' && <Badge status={item.estado} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  {item.personas && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      👤 {item.personas}
                    </span>
                  )}
                  {item.horaEstimadaLlegada && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      🕐 {item.horaEstimadaLlegada}
                    </span>
                  )}
                  <span>{item.fechaDesde} a {item.fechaHasta}</span>
                </div>
              </div>
              {item.tipo === 'amigos' && (item.invitados?.some(inv => inv.horaIngreso) || item.horaIngreso) && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  {item.invitados?.map((inv, i) => inv.horaIngreso && (
                    <span key={i}>{inv.nombre}: Ingreso {inv.horaIngreso}{inv.horaSalida ? ` / Salida ${inv.horaSalida}` : ''}</span>
                  ))}
                  {(!item.invitados?.length && item.horaIngreso) && (
                    <span>Ingreso {item.horaIngreso}{item.horaSalida ? ` / Salida ${item.horaSalida}` : ''}</span>
                  )}
                </div>
              )}
            </div>
          )];
        })}

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

            {/* Invitados list */}
            {detalleActual.invitados.length > 0 && (
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

              {p.base.instruccionDocumento && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: theme.radius.md,
                  background: p.base.instruccionDocumento === 'verificar' ? '#FEF3C7' : '#DBEAFE',
                  fontSize: theme.fonts.sizes.xs,
                  color: p.base.instruccionDocumento === 'verificar' ? '#92400E' : '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>{p.base.instruccionDocumento === 'verificar' ? '🆔' : '🔓'}</span>
                  <span>
                    {p.base.instruccionDocumento === 'verificar'
                      ? 'El residente solicita verificar documento'
                      : 'El residente NO solicita verificar documento'}
                  </span>
                </div>
              )}

              {p.base.tipoNotificacion && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: theme.radius.md,
                  background: '#F3F4F6',
                  fontSize: theme.fonts.sizes.xs,
                  color: theme.colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>🔔</span>
                  <span>
                    {p.base.tipoNotificacion === 'notificar-y-anunciar'
                      ? 'Notificar y anunciar'
                      : 'Solo notificar'}
                  </span>
                </div>
              )}

              <div style={{
                padding: '8px 12px',
                borderRadius: theme.radius.md,
                background: theme.colors.bgMuted,
                fontSize: theme.fonts.sizes.xs,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>🚗</span>
                <span>
                  {p.base.tieneVehiculo
                    ? 'Con vehículo'
                    : 'Sin vehículo'}
                  {p.base.vehiculos?.length > 0 && ` (${p.base.vehiculos.map(v => v.placa).filter(Boolean).join(', ')})`}
                </span>
              </div>

              {estacionamientosVisitantes && estacionamientosVisitantes.total > 0 && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: theme.radius.md,
                  background: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#F0FDF4' : '#FEF2F2',
                  fontSize: theme.fonts.sizes.xs,
                  color: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#166534' : '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>🅿️</span>
                  <span>
                    Estacionamiento visitas: {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados} disponibles
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                {[
                  { key: 'verifiqueCedula', label: 'Verifiqué la cédula' },
                  { key: 'llamoAnuncie', label: 'Llamé / No lo anuncié' },
                ].map(chk => (
                  <label
                    key={chk.key}
                    onClick={() => toggleInstruccionCumplida(p.base.id, chk.key)}
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
                      border: `2px solid ${cumplidas[chk.key] ? theme.colors.success : theme.colors.border}`,
                      background: cumplidas[chk.key] ? theme.colors.success : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 150ms',
                    }}>
                      {cumplidas[chk.key] && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    {chk.label}
                  </label>
                ))}
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
                    <Toggle value={p.persona.llego} onChange={() => {
                      if (p.base.tipo === 'huesped-temporal') {
                        setLlegoInvitado(p.base.id, p.idx, !p.persona.llego);
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
                  {p.base.tipo !== 'huesped-temporal' && p.base.ci && !p.persona.llego && (
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
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Ingreso</span>
                      <input
                        type="time"
                        value={p.persona.horaIngreso || ''}
                        onChange={e => actualizarHoraIngreso(p.base.id, p.idx, e.target.value)}
                        style={{
                          width: '90px',
                          padding: '4px 6px',
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border}`,
                          fontSize: '11px',
                          fontFamily: theme.fonts.family,
                          color: theme.colors.text,
                          background: theme.colors.bgMuted,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Salida</span>
                      <input
                        type="time"
                        value={p.persona.horaSalida || ''}
                        onChange={e => actualizarHoraSalida(p.base.id, p.idx, e.target.value)}
                        style={{
                          width: '90px',
                          padding: '4px 6px',
                          borderRadius: theme.radius.md,
                          border: `1px solid ${theme.colors.border}`,
                          fontSize: '11px',
                          fontFamily: theme.fonts.family,
                          color: theme.colors.text,
                          background: theme.colors.bgMuted,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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

    </AppShell>
  );
}
