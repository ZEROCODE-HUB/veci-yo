import { useRef } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import Button from '../../components/ui/Button';
import OnboardingHeader from './components/OnboardingHeader';
import { getDemoRole } from './demoRoles';

// Punto de entrada único para `/demo/:rol`. Si el rol ya tiene su flujo
// implementado (`available: true`) entra directo a la experiencia real;
// si todavía no, muestra un aviso de "próximamente" con su identidad.
// Sumar un nuevo rol disponible es solo marcarlo `available: true` y
// apuntar aquí su pantalla de entrada — nada más cambia.
export default function DemoRolePage() {
  const { rol } = useParams();
  const navigate = useNavigate();
  const { ingresarComoDemo } = useApp();
  const ingresado = useRef(false);

  const rolInfo = getDemoRole(rol);
  const disponible = !!rolInfo?.available;

  if (!rolInfo) return <Navigate to="/onboarding" replace />;

  if (disponible) {
    if (!ingresado.current) {
      ingresado.current = true;
      ingresarComoDemo(rolInfo.key);
    }
    return <Navigate to="/" replace />;
  }

  return (
    <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme.colors.bgApp, fontFamily: theme.fonts.family }}>
      <OnboardingHeader />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: '52px' }}>{rolInfo.emoji}</span>
        <h1 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          {rolInfo.label}
        </h1>
        <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed, maxWidth: '320px' }}>
          Este recorrido demo está en construcción. Muy pronto podrás explorar la experiencia de este rol desde aquí.
        </p>
        <Button variant="secondary" onClick={() => navigate('/onboarding')}>Volver al inicio</Button>
      </div>
    </div>
  );
}
