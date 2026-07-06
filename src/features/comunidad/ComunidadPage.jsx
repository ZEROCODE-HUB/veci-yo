import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import iconOfertas from '../../assets/icons/comunidad/ofertas.png';
import iconVentaGaraje from '../../assets/icons/comunidad/venta-garaje.png';
import iconPaginasAmarillas from '../../assets/icons/comunidad/paginas-amarillas.png';

const SECCIONES = [
  { key: 'ofertas', label: 'Ofertas', icon: iconOfertas },
  { key: 'venta-garaje', label: 'Venta de garaje', icon: iconVentaGaraje },
  { key: 'paginas-amarillas', label: 'Páginas amarillas', icon: iconPaginasAmarillas },
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
              onClick={undefined}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img src={sec.icon} alt={sec.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
