import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import theme from '../../config/theme';
import iconFaq from '../../assets/icons/soporte/Finales/preguntas_frecuentes (1).png';
import iconReclamos from '../../assets/icons/soporte/Finales/reclamos (1).png';
import iconContacto from '../../assets/icons/soporte/Finales/contacto.png';

const SECCIONES = [
  { key: 'faq', label: 'Preguntas frecuentes', icon: iconFaq, ruta: '/perfil/soporte/preguntas-frecuentes' },
  { key: 'reclamos', label: 'Centro de Atención', icon: iconReclamos, ruta: '/perfil/soporte/reclamos' },
  { key: 'contacto', label: 'Contacto', icon: iconContacto, ruta: '/perfil/soporte/contacto' },
];

export default function SoportePage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <PageHeader title="Soporte" />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {SECCIONES.map(sec => (
            <button
              key={sec.key}
              onClick={() => navigate(sec.ruta)}
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
                overflow: 'hidden',
              }}>
                <img src={sec.icon} alt={sec.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </span>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium, textAlign: 'center' }}>
                {sec.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
