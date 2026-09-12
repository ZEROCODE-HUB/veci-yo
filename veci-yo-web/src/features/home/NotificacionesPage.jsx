import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import { useApp } from '../../context/AppContext';
import { notificaciones } from '../../data/mockData';
import theme from '../../config/theme';

const ROL_INFO = {
  guardia: { key: 'guardia', label: 'Seguridad' },
  administrador: { key: 'administrador', label: 'Administrador' },
};

export default function NotificacionesPage() {
  const navigate = useNavigate();
  const { rolActivo } = useApp();

  const { key, label } = ROL_INFO[rolActivo] || { key: 'residente', label: 'Residente' };
  const lista = notificaciones[key] || [];

  return (
    <AppShell>
      <PageHeader title="Notificaciones" onBack={() => navigate(-1)} />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Mostrando novedades para:</span>
          <span style={{
            background: theme.colors.primaryLight,
            color: theme.colors.primaryDark,
            borderRadius: theme.radius.full,
            padding: '4px 12px',
            fontSize: theme.fonts.sizes.xs,
            fontWeight: theme.fonts.weights.semibold,
          }}>
            {label}
          </span>
        </div>

        {lista.length === 0 && (
          <div style={{ textAlign: 'center', color: theme.colors.textMuted, padding: '32px 0', fontSize: theme.fonts.sizes.base }}>
            No tienes notificaciones por el momento
          </div>
        )}

        {lista.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              border: item.leida ? 'none' : `1.5px solid ${theme.colors.primaryLight}`,
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: theme.colors.bgMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}>
              {item.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!item.leida && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.colors.danger, flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                  {item.titulo}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights?.normal || 1.5 }}>
                {item.mensaje}
              </p>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
                <span>🕐</span>
                <span>{item.hora} · {item.fecha}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
