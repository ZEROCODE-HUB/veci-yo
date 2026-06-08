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
import { useApp } from '../../context/AppContext';
import { zonasComunes } from '../../data/mockData';
import theme from '../../config/theme';
import zonaIcons from '../../assets/icons/zonas';

const ESTADOS = ['Reservado', 'No disponible', 'Disponible'];

const borderByEstado = {
  Reservado: theme.colors.primary,
  Disponible: theme.colors.secondary,
  'No disponible': 'transparent',
};

export default function ZonaDetallesPage() {
  const { zonaId } = useParams();
  const navigate = useNavigate();
  const { reservas, actualizarEstadoReserva, eliminarReserva, addToast } = useApp();

  const zona = zonasComunes.find(z => z.id === zonaId) || { nombre: zonaId, emoji: '🏢' };
  const zonasReservas = reservas.filter(r => r.zonaId === zonaId);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const filtered = zonasReservas.filter(r => {
    const matchSearch = !search || r.depto.toLowerCase().includes(search.toLowerCase());
    const matchTab = !activeTab || r.estado === activeTab;
    return matchSearch && matchTab;
  });

  const handleEstado = (estado) => {
    actualizarEstadoReserva(menuItem.id, estado);
    setMenuItem(null);
  };

  const handleEliminar = () => {
    eliminarReserva(deleteItem.id);
    setDeleteItem(null);
  };

  return (
    <AppShell>
      <PageHeader
        title={zona.nombre}
        action={
          <button
            onClick={() => navigate(`/zonas-comunes/${zonaId}/reservar`)}
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
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
            <span style={{ color: theme.colors.textMuted, fontSize: '16px' }}>▾</span>
          </div>
        </div>

        {/* Reservation list */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: theme.colors.textMuted, padding: '32px 0', fontSize: theme.fonts.sizes.base }}>
            No hay reservas para esta zona
          </div>
        )}

        {filtered.map(item => (
          <div
            key={item.id}
            style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              border: `2px solid ${borderByEstado[item.estado] || 'transparent'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {zonaIcons[zona.id] ? (
                    <img
                      src={zonaIcons[zona.id]}
                      alt={zona.nombre}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '20px' }}>{zona.emoji}</span>
                  )}
                  <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{item.depto}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                    <span style={{ fontSize: '14px', color: theme.colors.success }}>✔✔</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', color: theme.colors.textSecondary }}>🪪</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{item.reservaNum}.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', color: theme.colors.textSecondary }}>🕐</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.horario}</span>
                </div>
              </div>
              <button
                onClick={() => setMenuItem(item)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: theme.colors.bgMuted,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: theme.colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ⋮
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit bottom sheet */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Estado: Aprobado" onPress={() => handleEstado('Disponible')} />
        <BottomSheetOption label="Estado: Denegado" onPress={() => handleEstado('No disponible')} />
        <BottomSheetOption
          label="Eliminar"
          variant="danger"
          onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }}
        />
      </BottomSheet>

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
    </AppShell>
  );
}
