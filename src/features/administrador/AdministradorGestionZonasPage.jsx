import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import zonaIcons, { zonaBanners } from '../../assets/icons/zonas';

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
  const [menuOpen, setMenuOpen] = useState(null);

  const zonas = Object.values(gestionZonas);

  useEffect(() => { if (menuOpen) { const handler = () => setMenuOpen(null); window.addEventListener('scroll', handler, { once: true }); return () => window.removeEventListener('scroll', handler); } }, [menuOpen]);

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
            Crear Zona Común
          </Button>
        </div>

        {zonas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
            No hay zonas comunes configuradas. Crea la primera.
          </div>
        ) : (
          zonas.map(zona => {
            const bannerSrc = zonaBanners[zona.id] || null;
            const iconSrc = zonaIcons[zona.id] || null;
            return (
              <div
                key={zona.id}
                onClick={() => navigate(`/admin/gestion-zonas/${zona.id}`)}
                style={{
                  background: theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  boxShadow: theme.shadows.card,
                  overflow: 'hidden',
                  animation: 'fadeIn 250ms ease',
                  cursor: 'pointer',
                }}
              >
                {/* Banner */}
                <div style={{
                  width: '100%',
                  height: '140px',
                  background: 'linear-gradient(135deg, #D4C5A9 0%, #B8A98C 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {bannerSrc ? (
                    <img src={bannerSrc} alt={zona.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : iconSrc ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={iconSrc} alt={zona.nombre} style={{ width: '64px', height: '64px', objectFit: 'contain', opacity: 0.7 }} />
                    </div>
                  ) : null}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Badge status={zona.activa ? 'Activa' : 'Inactiva'} />
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === zona.id ? null : zona.id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: theme.colors.textSecondary,
                            padding: '4px 6px',
                            borderRadius: '8px',
                            lineHeight: 1,
                          }}
                        >
                          ⋯
                        </button>
                        {menuOpen === zona.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              zIndex: 10,
                              background: '#fff',
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                              minWidth: '160px',
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              animation: 'fadeIn 150ms ease',
                            }}
                          >
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/admin/gestion-zonas/${zona.id}/reservas`); setMenuOpen(null); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: theme.fonts.sizes.sm,
                                color: theme.colors.text,
                                fontWeight: theme.fonts.weights.medium,
                                width: '100%',
                                textAlign: 'left',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = theme.colors.bgSecondary}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              📋 Ver Reservas
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={e => { e.stopPropagation(); navigate(`/admin/gestion-zonas/${zona.id}`); }}
                    >
                      Editar
                    </Button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(zona.id); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '8px', borderRadius: '50%', color: theme.colors.danger,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title="Eliminar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
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
