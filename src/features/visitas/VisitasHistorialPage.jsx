import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import QRDisplay from '../../components/ui/QRDisplay';
import Toggle from '../../components/ui/Toggle';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import tipoVisitaIcons from '../../assets/icons/visitas';
import { torres, departamentos } from '../../data/mockData';

const TABS = ['Todas', 'Rechazado', 'Pendiente', 'Aceptado'];
const TIPOS = ['Todos', 'Amigos Familiares', 'Profesional Temporal', 'Profesional Permanente', 'Huésped Temporal'];

const TIPO_LABELS = {
  amigos: 'Amigos Familiares',
  temporal: 'Profesional Temporal',
  permanente: 'Profesional Permanente',
  'huesped-temporal': 'Huésped Temporal',
};

export default function VisitasHistorialPage() {
  const navigate = useNavigate();
  const { visitas, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado, toggleFavoritoInvitado, aprobarInvitado, rolActivo, addToast, verificaciones, actualizarVerificacion } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todas');
  const [filterOpen, setFilterOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');
  const [deptoFilter, setDeptoFilter] = useState('');
  const [torreFilter, setTorreFilter] = useState('');
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [detalleItem, setDetalleItem] = useState(null);
  const [verificandoInvitado, setVerificandoInvitado] = useState(null);
  const [capturaStep, setCapturaStep] = useState(null);
  const [verifResultado, setVerifResultado] = useState(null);

  const detalleActual = detalleItem ? visitas.find(v => v.id === detalleItem.id) || null : null;

  const filtered = visitas.filter(v => {
    const matchSearch = !search || v.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todas' || v.estado === activeTab;
    const matchTipo = tipoFilter === 'Todos' || TIPO_LABELS[v.tipo] === tipoFilter;
    const matchFechaDesde = !fechaDesdeFilter || (v.fechaDesde && v.fechaDesde >= fechaDesdeFilter);
    const matchFechaHasta = !fechaHastaFilter || (v.fechaHasta && v.fechaHasta <= fechaHastaFilter);
    const matchTorre = !torreFilter || v.torre === torreFilter;
    const matchDepto = !deptoFilter || v.depto === deptoFilter;
    return matchSearch && matchTab && matchTipo && matchFechaDesde && matchFechaHasta && matchTorre && matchDepto;
  });

  const handleEstado = (estado) => {
    actualizarEstadoVisita(menuItem.id, estado);
    if (estado === 'Aceptado' && menuItem) {
      addToast(`Notificación enviada: ${menuItem.nombre} — Correo, SMS y Push`);
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
        title="Historial visitas"
        action={
          <ModuloHeaderInfo
            helpKey="visitas"
            action={
              <button
                onClick={() => navigate('/visitas/nuevo')}
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
        }
      />

      <ModuloGate helpKey="visitas">
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Filter card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          <div style={{ marginTop: '10px' }}>
            <StatusTabs
              tabs={TABS}
              active={activeTab}
              onChange={tab => setActiveTab(tab || 'Todas')}
              centered
            />
          </div>
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
              <SelectField label="Tipo" value={tipoFilter === 'Todos' ? '' : tipoFilter} options={TIPOS} onChange={setTipoFilter} />
              {/* Date filters stacked vertically */}
              <div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                <input
                  type="date"
                  value={fechaDesdeFilter}
                  onChange={e => setFechaDesdeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    background: theme.colors.bgCard,
                    borderRadius: theme.radius['2xl'],
                    padding: '11px 14px',
                    border: `1.5px solid ${theme.colors.border}`,
                    fontSize: theme.fonts.sizes.sm,
                    fontFamily: theme.fonts.family,
                    color: theme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                <input
                  type="date"
                  value={fechaHastaFilter}
                  onChange={e => setFechaHastaFilter(e.target.value)}
                  style={{
                    width: '100%',
                    background: theme.colors.bgCard,
                    borderRadius: theme.radius['2xl'],
                    padding: '11px 14px',
                    border: `1.5px solid ${theme.colors.border}`,
                    fontSize: theme.fonts.sizes.sm,
                    fontFamily: theme.fonts.family,
                    color: theme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {/* Direction fields with visible labels */}
              <div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Torre</div>
                <SelectField value={torreFilter} options={['', ...torres]} onChange={setTorreFilter} placeholder="Torre" />
              </div>
              <div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Departamento</div>
                <SelectField value={deptoFilter} options={['', ...departamentos]} onChange={setDeptoFilter} placeholder="Depto" />
              </div>
              <button
                onClick={() => { setFechaDesdeFilter(''); setFechaHastaFilter(''); setTorreFilter(''); setDeptoFilter(''); setTipoFilter('Todos'); }}
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
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* List */}
        {filtered.map(item => (
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
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                    CI:{item.ci}
                  </div>
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
              <Badge status={item.estado} />
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
          </div>
        ))}
      </div>
      </ModuloGate>

      {/* Edit bottom sheet — acciones según el rol */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Estado: Aceptado" onPress={() => handleEstado('Aceptado')} />
        {rolActivo === 'administrador' && (
          <BottomSheetOption label="Estado: Rechazado" onPress={() => handleEstado('Rechazado')} />
        )}
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
                <Badge status={deleteItem.estado} />
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
        onClose={() => setDetalleItem(null)}
        title={detalleActual?.tipo === 'huesped-temporal' ? `Reserva: ${detalleActual?.reserva || ''}` : `Visita: ${detalleItem?.fechaDesde || ''}`}
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
              <div>
                <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{detalleActual.nombre}</div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{detalleActual.torre} - {detalleActual.depto}</div>
              </div>
            </div>

            {/* Invitados list */}
            {detalleActual.invitados.length > 0 && (
              <div>
                <p style={{ fontWeight: theme.fonts.weights.bold, textDecoration: 'underline', marginBottom: '10px' }}>Huéspedes:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {detalleActual.invitados.map((inv, i) => {
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
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}`, flexWrap: 'wrap', gap: '6px' }}>
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
                            <span style={{ fontSize: theme.fonts.sizes.base }}>{inv.nombre}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Toggle value={inv.llego} onChange={() => toggleLlegoInvitado(detalleActual.id, i)} />
                            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Llego</span>
                          </div>
                        </div>
                        {/* Minor alert for minors without tutela */}
                        {esHuespedTemp && inv.esMenor && !inv.tieneTutela && (
                          <div style={{ padding: '8px 12px', margin: '4px 0 8px 26px', background: '#FFF8E1', borderRadius: theme.radius.md, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span style={{ fontSize: theme.fonts.sizes.xs, color: '#8D6E00' }}>
                              Este huésped no está en capacidad de aceptar los Términos y Condiciones
                            </span>
                          </div>
                        )}
                        {/* Document visualization */}
                        {esHuespedTemp && inv.documentos && inv.documentos.length > 0 && (
                          <div style={{ padding: '4px 0 8px 26px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {inv.documentos.map((doc, di) => {
                              const info = docLabels[doc] || { label: doc };
                              return (
                                <button
                                  key={di}
                                  onClick={() => addToast(`Visualizando ${info.label}`)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: theme.radius.full,
                                    background: theme.colors.bgMuted,
                                    border: `1px solid ${theme.colors.border}`,
                                    cursor: 'pointer',
                                    fontSize: theme.fonts.sizes.xs,
                                    fontFamily: theme.fonts.family,
                                    color: theme.colors.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
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
                        {/* Approve/reject buttons for huesped-temporal */}
                        {esHuespedTemp && (esAdmin || esAnfitrion) && inv.aprobado === 'pendiente' && (
                          <div style={{ padding: '4px 0 8px 26px', display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => aprobarInvitado(detalleActual.id, i, 'aprobado')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: theme.radius.full,
                                background: theme.colors.success,
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: theme.fonts.sizes.xs,
                                fontWeight: theme.fonts.weights.semibold,
                                fontFamily: theme.fonts.family,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              Aprobar
                            </button>
                            <button
                              onClick={() => aprobarInvitado(detalleActual.id, i, 'rechazado')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: theme.radius.full,
                                background: theme.colors.danger,
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: theme.fonts.sizes.xs,
                                fontWeight: theme.fonts.weights.semibold,
                                fontFamily: theme.fonts.family,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Rechazar
                            </button>
                          </div>
                        )}
                        {/* Show approval status badge when already decided */}
                        {esHuespedTemp && inv.aprobado && inv.aprobado !== 'pendiente' && (
                          <div style={{ padding: '4px 0 8px 26px' }}>
                            <Badge status={inv.aprobado === 'aprobado' ? 'Aceptado' : 'Rechazado'} />
                          </div>
                        )}
                        {/* Verification status for admin/anfitrión */}
                        {puedeVerVerificacion && (
                          <div style={{ padding: '8px 0 8px 26px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Verificación:</span>
                              <Badge status={
                                verif.estado === 'verificado' ? 'Aceptado' :
                                verif.estado === 'no-coincide' ? 'Rechazado' : 'Pendiente'
                              } />
                              {verif.fechaVerificacion && (
                                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>{verif.fechaVerificacion}</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {verif.documentoOriginal && (
                                <button
                                  onClick={() => addToast('Visualizando documento original del Pre Check-in')}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: theme.radius.full,
                                    background: theme.colors.bgMuted,
                                    border: `1px solid ${theme.colors.border}`,
                                    cursor: 'pointer',
                                    fontSize: theme.fonts.sizes.xs,
                                    fontFamily: theme.fonts.family,
                                    color: theme.colors.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  Doc. Pre Check-in
                                </button>
                              )}
                              {verif.documentoTomado && (
                                <button
                                  onClick={() => addToast('Visualizando documento capturado en ingreso')}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: theme.radius.full,
                                    background: theme.colors.bgMuted,
                                    border: `1px solid ${theme.colors.border}`,
                                    cursor: 'pointer',
                                    fontSize: theme.fonts.sizes.xs,
                                    fontFamily: theme.fonts.family,
                                    color: theme.colors.text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
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
                          </div>
                        )}
                        {/* Verify button for guardia */}
                        {puedeVerificar && (
                          <div style={{ padding: '4px 0 8px 26px' }}>
                            {verif?.estado === 'verificado' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  Documento verificado correctamente
                                </span>
                              </div>
                            ) : verif?.estado === 'no-coincide' ? (
                              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Documento no coincide
                              </span>
                            ) : verif?.estado === 'fallido' ? (
                              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.warning, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Verificación fallida
                              </span>
                            ) : (
                              <button
                                onClick={() => setVerificandoInvitado({ visitaId: detalleActual.id, invitadoIdx: i, nombre: inv.nombre })}
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
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                                </svg>
                                Verificar documento
                              </button>
                            )}
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
                  onClick={() => addToast('Descarga de tutela iniciada')}
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
            <QRDisplay url={detalleActual.qrUrl} />
          </div>
        )}
      </Modal>

      {/* Verification camera modal — for Guardia */}
      <Modal
        isOpen={!!verificandoInvitado && capturaStep === null}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Verificar documento"
      >
        {verificandoInvitado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: theme.radius.xl,
              background: theme.colors.bgMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px dashed ${theme.colors.border}`,
              fontSize: '48px',
              color: theme.colors.textMuted,
            }}>
              📷
            </div>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
              Capture la fotografía del documento presentado por <strong>{verificandoInvitado.nombre}</strong>
            </p>
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
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Comparando documentos...</p>
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
          <Button variant="primary" fullWidth onClick={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}>
            Cerrar
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
