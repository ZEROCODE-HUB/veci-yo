import theme from '../../config/theme';
import Badge from './Badge';

export default function StatusTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {tabs.map(tab => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(active === tab ? null : tab)}
            style={{
              padding: '6px 14px',
              borderRadius: theme.radius.full,
              fontSize: theme.fonts.sizes.sm,
              fontWeight: theme.fonts.weights.semibold,
              fontFamily: theme.fonts.family,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 150ms',
              ...(isActive
                ? (() => {
                    const statusMap = {
                      'No Recibido': { bg: theme.colors.primary, color: theme.colors.text },
                      'En Portería': { bg: theme.colors.statusGray, color: theme.colors.textSecondary },
                      'Entregado': { bg: theme.colors.secondary, color: '#fff' },
                      'Rechazado': { bg: theme.colors.primary, color: theme.colors.text },
                      'Pendiente': { bg: theme.colors.statusGray, color: theme.colors.textSecondary },
                      'Aceptado': { bg: theme.colors.secondary, color: '#fff' },
                      'Reservado': { bg: theme.colors.primary, color: theme.colors.text },
                      'No disponible': { bg: theme.colors.statusGray, color: theme.colors.textSecondary },
                      'Disponible': { bg: theme.colors.secondary, color: '#fff' },
                    };
                    return statusMap[tab] || { bg: theme.colors.primary, color: theme.colors.text };
                  })()
                : { bg: 'transparent', color: theme.colors.textSecondary }
              ),
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
