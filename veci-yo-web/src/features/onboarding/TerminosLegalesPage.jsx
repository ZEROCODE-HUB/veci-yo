import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import LegalAccordion from '../../components/ui/LegalAccordion';
import OnboardingHeader from './components/OnboardingHeader';

export default function TerminosLegalesPage() {
  const navigate = useNavigate();

  return (
    <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme.colors.bgApp, fontFamily: theme.fonts.family }}>
      <OnboardingHeader />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: theme.colors.text,
            fontFamily: theme.fonts.family,
            fontSize: theme.fonts.sizes.sm,
            fontWeight: theme.fonts.weights.medium,
            padding: '6px 0',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>

        <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', margin: 0 }}>
          Documentos Legales
        </h2>

        <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
          Revisa y acepta nuestros documentos legales para continuar.
        </p>

        <LegalAccordion />
      </div>
    </div>
  );
}
