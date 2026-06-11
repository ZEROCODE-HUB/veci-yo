import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';

const SECCIONES = [
  { key: 'ofertas', label: 'Ofertas', emoji: '🏷️' },
  { key: 'venta-garaje', label: 'Venta de garaje', emoji: '📦' },
  { key: 'paginas-amarillas', label: 'Páginas amarillas', emoji: '📒' },
];

export default function ComunidadPage() {
  const { addToast } = useApp();

  return (
    <AppShell>
      <PageHeader title="Comunidad" />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {SECCIONES.map(sec => (
            <button
              key={sec.key}
              onClick={() => addToast('Funcionalidad en desarrollo')}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: theme.shadows.card,
                border: 'none',
                cursor: 'pointer',
                minHeight: '120px',
                fontFamily: theme.fonts.family,
              }}
            >
              <span style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: theme.colors.iconAmberBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}>
                {sec.emoji}
              </span>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>
                {sec.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
