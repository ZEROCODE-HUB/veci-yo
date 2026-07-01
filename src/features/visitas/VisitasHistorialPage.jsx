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
  const { visitas, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado, toggleFavoritoInvitado, rolActivo } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todas');
  const [filterOpen, setFilterOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [detalleItem, setDetalleItem] = useState(null);

  const detalleActual = detalleItem ? visitas.find(v => v.id === detalleItem.id) || null : null;

  const filtered = visitas.filter(v => {
    const matchSearch = !search || v.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todas' || v.estado === activeTab;
    const matchTipo = tipoFilter === 'Todos' || TIPO_LABELS[v.tipo] === tipoFilter;
    return matchSearch && matchTab && matchTipo;
  });

  const handleEstado = (estado) => {
    actualizarEstadoVisita(menuItem.id, estado);
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
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '16px',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms',
              }}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', marginTop: '8px' }}>
              <SelectField label="Tipo" value={tipoFilter === 'Todos' ? '' : tipoFilter} options={TIPOS} onChange={setTipoFilter} />
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

      {/* Detail modal — sin botón +Agregar invitado */}
      <Modal
        isOpen={!!detalleItem}
        onClose={() => setDetalleItem(null)}
        title={`Visitas de Evento ${detalleItem?.fechaDesde || ''}`}
      >
        {detalleActual && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {detalleActual.invitados.length > 0 && (
              <div>
                <p style={{ fontWeight: theme.fonts.weights.bold, textDecoration: 'underline', marginBottom: '10px' }}>Invitados:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {detalleActual.invitados.map((inv, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 0',
                        borderBottom: `1px solid ${theme.colors.borderLight}`,
                      }}
                    >
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle value={inv.llego} onChange={() => toggleLlegoInvitado(detalleActual.id, i)} />
                        <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Llego</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <QRDisplay url={detalleActual.qrUrl} />
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
