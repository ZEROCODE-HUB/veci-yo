import theme from '../../config/theme';

const STATUS_COLORS = {
  'No Recibido':   { bg: theme.colors.primary,    color: theme.colors.text },
  'En Portería':   { bg: theme.colors.statusGray,  color: theme.colors.textSecondary },
  'Entregado':     { bg: theme.colors.secondary,   color: '#fff' },
  'Rechazado':     { bg: theme.colors.primary,     color: theme.colors.text },
  'Pendiente':     { bg: theme.colors.statusGray,  color: theme.colors.textSecondary },
  'Aceptado':      { bg: theme.colors.secondary,   color: '#fff' },
  'Reservado':     { bg: theme.colors.primary,     color: theme.colors.text },
  'No disponible': { bg: theme.colors.statusGray,  color: theme.colors.textSecondary },
  'Disponible':    { bg: theme.colors.secondary,   color: '#fff' },
  'Todos':         { bg: theme.colors.text,        color: '#fff' },
  'Todas':         { bg: theme.colors.text,        color: '#fff' },
};

export default function StatusTabs({ tabs, active, onChange, centered = false }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: centered ? 'center' : 'flex-start' }}>
      {tabs.map(tab => {
        const isActive = active === tab;
        const colors = STATUS_COLORS[tab] || { bg: theme.colors.primary, color: theme.colors.text };
        return (
          <button
            key={tab}
            onClick={() => onChange(isActive ? null : tab)}
            style={{
              padding: '6px 14px',
              borderRadius: theme.radius.full,
              fontSize: theme.fonts.sizes.sm,
              fontWeight: theme.fonts.weights.semibold,
              fontFamily: theme.fonts.family,
              cursor: 'pointer',
              border: isActive ? `2.5px solid ${theme.colors.text}` : '2.5px solid transparent',
              transition: 'all 150ms',
              background: colors.bg,
              color: colors.color,
              opacity: isActive ? 1 : 0.6,
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
