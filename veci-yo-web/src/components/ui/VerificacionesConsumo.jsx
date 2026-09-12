import theme from '../../config/theme';

// Barras de consumo de verificaciones del paquete de suscripción.
// Reutilizable: se alimenta de configHuespedesTemporales[ubicacionId].verificaciones.
export default function VerificacionesConsumo({ verificaciones, suscripcionActiva = false }) {
  if (!verificaciones) {
    return (
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
        <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
          Sin información de verificaciones para esta propiedad.
        </span>
      </div>
    );
  }

  const incluidas = verificaciones.incluidas ?? 20;
  const usadas = verificaciones.suscritasUsadas ?? 0;
  const baseDisponibles = Math.max(0, incluidas - usadas);
  const adicional = verificaciones.suplementarias ?? 0;
  const vencimiento = verificaciones.vencimientoSuplementarias;

  const Barra = ({ label, disponibles, total }) => {
    const pct = total > 0 ? Math.round((disponibles / total) * 100) : 0;
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.text }}>{label}</span>
          <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>
            {disponibles} disponibles
          </span>
        </div>
        <div style={{ height: '8px', borderRadius: theme.radius.full, background: theme.colors.borderLight, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: theme.radius.full, background: theme.colors.primary }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
      {!suscripcionActiva && (
        <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, marginBottom: '8px' }}>
          Sin suscripción activa
        </div>
      )}
      <Barra label="Verificaciones disponibles · Paquete base" disponibles={baseDisponibles} total={incluidas} />
      {adicional > 0 && (
        <Barra
          label={`Verificaciones disponibles · Paquete adicional${vencimiento ? ` (vence ${vencimiento})` : ''}`}
          disponibles={adicional}
          total={Math.max(adicional, 1)}
        />
      )}
    </div>
  );
}
