import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import zonaIcons from '../../assets/icons/zonas';

const TIPO_LABELS = {
  'Barbecue': 'Barbecue',
  'Swimming Pool': 'Swimming Pool',
  'Children\'s Park': 'Children\'s Park',
  'Gym': 'Gym',
  'Coworking Space': 'Coworking Space',
  'Tennis Court': 'Tennis Court',
  'Game Room': 'Game Room',
  'Laundry Room': 'Laundry Room',
};

export default function AdministradorGestionZonasPage() {
  const navigate = useNavigate();
  const { gestionZonas, eliminarGestionZona, addToast } = useApp();
  const [deleteId, setDeleteId] = useState(null);

  const zonas = Object.values(gestionZonas);

  const handleEliminar = () => {
    if (!deleteId) return;
    eliminarGestionZona(deleteId);
    setDeleteId(null);
    addToast('Zona común eliminada correctamente');
  };

  const zonaAEliminar = deleteId ? gestionZonas[deleteId] : null;

  return (
    <AppShell>
      <PageHeader title="Gestión de Zonas Comunes" onBack={() => navigate(-1)} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0, lineHeight: 1.3 }}>
              Gestión de Zonas Comunes
            </h1>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: '4px 0 0', lineHeight: 1.4 }}>
              Administra las zonas comunes disponibles para los residentes.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/admin/gestion-zonas/nuevo')} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            + Crear Zona Común
          </Button>
        </div>

        {zonas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
            No hay zonas comunes configuradas. Crea la primera.
          </div>
        ) : (
          zonas.map(zona => {
            const imgSrc = zonaIcons[zona.id] || null;
            return (
              <div
                key={zona.id}
                style={{
                  background: theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  boxShadow: theme.shadows.card,
                  overflow: 'hidden',
                  animation: 'fadeIn 250ms ease',
                }}
              >
                {/* Banner */}
                <div style={{
                  width: '100%',
                  height: '120px',
                  background: imgSrc
                    ? `linear-gradient(135deg, ${theme.colors.primaryLight} 0%, #E8E0D0 100%)`
                    : `linear-gradient(135deg, ${theme.colors.border} 0%, ${theme.colors.bgMuted} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {imgSrc && (
                    <img src={imgSrc} alt={zona.nombre} style={{ width: '72px', height: '72px', objectFit: 'contain', opacity: 0.9 }} />
                  )}
                </div>

                {/* Body */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                        {zona.nombre}
                      </div>
                      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
                        {TIPO_LABELS[zona.tipo] || zona.tipo}
                      </div>
                    </div>
                    <Badge status={zona.activa ? 'Activa' : 'Inactiva'} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      🕐 {zona.horarioApertura} - {zona.horarioCierre}
                    </span>
                    {zona.montoGarantia > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        💰 {zona.moneda} {zona.montoGarantia.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => navigate(`/admin/gestion-zonas/${zona.id}`)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => setDeleteId(zona.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar zona común">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            ¿Deseas eliminar esta zona común?<br />
            <strong>{zonaAEliminar?.nombre}</strong>
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', margin: 0 }}>
            Esta acción no puede deshacerse.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" fullWidth onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" fullWidth onClick={handleEliminar}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
