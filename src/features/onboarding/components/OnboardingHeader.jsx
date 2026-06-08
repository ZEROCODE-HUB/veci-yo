import theme from '../../../config/theme';

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
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: theme.colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
      }}>
        🦉
      </div>
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
