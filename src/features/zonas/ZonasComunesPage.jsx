import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import { zonasComunes } from '../../data/mockData';
import theme from '../../config/theme';

export default function ZonasComunesPage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <PageHeader title="Zonas Comunes" />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {zonasComunes.map(zona => {
            const isFull = zona.disponibles >= zona.total;
            return (
              <button
                key={zona.id}
                onClick={() => navigate(`/zonas-comunes/${zona.id}`)}
                style={{
                  background: theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: theme.shadows.card,
                  border: isFull ? `2px solid ${theme.colors.primary}` : `2px solid transparent`,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  position: 'relative',
                }}
              >
                {/* Capacity badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    fontSize: theme.fonts.sizes.xs,
                    fontWeight: theme.fonts.weights.semibold,
                    color: isFull ? theme.colors.danger : theme.colors.textSecondary,
                  }}
                >
                  {zona.disponibles}/{zona.total}
                </div>

                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                  }}
                >
                  {zona.emoji}
                </div>
                <span
                  style={{
                    fontSize: theme.fonts.sizes.sm,
                    fontWeight: theme.fonts.weights.semibold,
                    color: theme.colors.text,
                  }}
                >
                  {zona.nombre}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
