import theme from '../../../config/theme';
import Logo from '../../../components/ui/Logo';

export default function OnboardingHeader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '22px 16px 16px',
      flexShrink: 0,
    }}>
      <Logo size={40} />
      <span style={{
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        fontFamily: theme.fonts.family,
      }}>
        Veciyo
      </span>
    </div>
  );
}
