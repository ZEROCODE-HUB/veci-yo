import theme from '../../config/theme';

const statusMap = {
  // Correspondencia
  'Entregado':    { bg: theme.colors.secondary,    color: '#fff' },
  'En Portería':  { bg: theme.colors.statusGray,   color: theme.colors.textSecondary },
  'No Recibido':  { bg: theme.colors.primary,      color: theme.colors.text },
  // Visitas
  'Aceptado':     { bg: theme.colors.secondary,    color: '#fff' },
  'Pendiente':    { bg: theme.colors.statusGray,   color: theme.colors.textSecondary },
  'Rechazado':    { bg: theme.colors.primary,      color: theme.colors.text },
  // Zonas
  'Reservado':    { bg: theme.colors.primary,      color: theme.colors.text },
  'No disponible':{ bg: theme.colors.statusGray,   color: theme.colors.textSecondary },
  'Disponible':   { bg: theme.colors.secondary,    color: '#fff' },
  // Contratos
  'Activa':       { bg: theme.colors.primary,      color: theme.colors.text },
  'Finalizado':   { bg: theme.colors.secondary,    color: '#fff' },
};

export default function Badge({ status, children, style = {} }) {
  const label = children || status;
  const colors = statusMap[status] || { bg: theme.colors.statusGray, color: theme.colors.textSecondary };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: theme.radius.full,
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.semibold,
        whiteSpace: 'nowrap',
        background: colors.bg,
        color: colors.color,
        fontFamily: theme.fonts.family,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
