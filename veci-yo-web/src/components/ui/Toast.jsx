import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '90px',
        left: '16px',
        right: '16px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: toast.type === 'error' ? theme.colors.danger : theme.colors.text,
            color: '#fff',
            borderRadius: theme.radius.lg,
            padding: '12px 16px',
            fontSize: theme.fonts.sizes.sm,
            fontWeight: theme.fonts.weights.medium,
            boxShadow: theme.shadows.md,
            animation: 'toastIn 300ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>
            {toast.type === 'error' ? '⚠️' : '✓'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
