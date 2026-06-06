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
import QRDisplay from '../../components/ui/QRDisplay';
import Toggle from '../../components/ui/Toggle';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';

const ESTADOS = ['Rechazado', 'Pendiente', 'Aceptado'];
const TIPOS = ['Todos', 'Amigos Familiares', 'Profesional Temporal', 'Profesional Permanente'];

const TIPO_ICONS = {
  amigos: '🏠',
  temporal: '👷',
  permanente: '👩‍⚕️',
};

const TIPO_LABELS = {
  amigos: 'Amigos Familiares',
  temporal: 'Profesional Temporal',
  permanente: 'Profesional Permanente',
};

export default function VisitasHistorialPage() {
  const navigate = useNavigate();
  const { visitas, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [detalleItem, setDetalleItem] = useState(null);

  const filtered = visitas.filter(v => {
    const matchSearch = !search || v.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTab = !activeTab || v.estado === activeTab;
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

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Filter card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          <div style={{ marginTop: '10px' }}>
            <StatusTabs tabs={ESTADOS} active={activeTab} onChange={setActiveTab} />
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.textSecondary }}>Tipo:</span>
            <select
              value={tipoFilter}
              onChange={e => setTipoFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.bgCard,
                fontFamily: theme.fonts.family,
                fontSize: theme.fonts.sizes.sm,
                cursor: 'pointer',
              }}
            >
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}>
                  {TIPO_ICONS[item.tipo]}
                </div>
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.textSecondary,
                  fontSize: '20px',
                  padding: '4px',
                  flexShrink: 0,
                }}
              >
                ⋮
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <Badge status={item.estado} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                <span>🕐</span>
                <span>{item.fechaDesde} a {item.fechaHasta}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit bottom sheet */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Estado: Aceptado" onPress={() => handleEstado('Aceptado')} />
        <BottomSheetOption label="Estado: Rechazado" onPress={() => handleEstado('Rechazado')} />
        <BottomSheetOption
          label="Eliminar"
          variant="danger"
          onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }}
        />
      </BottomSheet>

      {/* Delete modal */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar visita">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg }}>Seguro que desea<br/>eliminar la visita!</p>
          {deleteItem && (
            <div style={{
              background: theme.colors.bgMuted,
              borderRadius: theme.radius.xl,
              padding: '14px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{TIPO_ICONS[deleteItem.tipo]}</span>
                <span style={{ fontWeight: theme.fonts.weights.semibold }}>{deleteItem.reserva}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Badge status={deleteItem.estado} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{deleteItem.fechaDesde}</span>
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Generar</Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={!!detalleItem} onClose={() => setDetalleItem(null)} title={`Visitas de Evento ${detalleItem?.fechaDesde || ''}`}>
        {detalleItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {detalleItem.invitados.length > 0 && (
              <div>
                <p style={{ fontWeight: theme.fonts.weights.bold, textDecoration: 'underline', marginBottom: '10px' }}>Invitados:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {detalleItem.invitados.map((inv, i) => (
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
                      <span style={{ fontSize: theme.fonts.sizes.base }}>{inv.nombre}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Toggle value={inv.llego} onChange={() => toggleLlegoInvitado(detalleItem.id, i)} />
                        <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Llego</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <QRDisplay url={detalleItem.qrUrl} />
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
