import theme from '../../config/theme';

// Línea de tiempo HORIZONTAL tipo "delivery" para la Card de Reserva.
// Una sola fila de íconos (referencia visual) sobre la primera línea de puntos;
// cada huésped tiene su propia línea horizontal de 6 pasos con su estado.
// Los puntos se unen con una línea continua (estilo card de detalle de huésped).
// Reutiliza los íconos y la lógica de estados existentes (no se altera la lógica).
const STEPS = [
  { key: 'preregistroEnviado', icon: '🔗' },
  { key: 'documentacionCompleta', icon: '📄' },
  { key: 'terminosAceptados', icon: '📝' },
  { key: 'verificacionPasada', icon: '🛡️' },
  { key: 'trasideEntrada', icon: '🟢' },
  { key: 'trasideSalida', icon: '🔴' },
];

export default function TimelineReservaHuespedes({ invitados = [] }) {
  if (!invitados.length) return null;

  return (
    <div>
      {/* Íconos referenciales: una sola vez, sobre la primera línea de puntos */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '6px' }}>
        {STEPS.map(s => (
          <div key={s.key} style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start', fontSize: '14px', lineHeight: 1 }}>
            {s.icon}
          </div>
        ))}
      </div>

      {invitados.map((inv, idx) => {
        const t = inv.timeline || {};
        return (
          <div key={idx} style={{ marginTop: idx === 0 ? 0 : '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.xs, color: theme.colors.text }}>{inv.nombre}</span>
              {inv.esMenor && (
                <span style={{ fontSize: theme.fonts.sizes['2xs'], fontWeight: theme.fonts.weights.bold, color: '#92400E', background: '#FEF3C7', padding: '2px 7px', borderRadius: theme.radius.full, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  👶 Menor
                </span>
              )}
            </div>
            {/* Línea de progreso continua (puntos unidos por una línea) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              {STEPS.map((step, si) => {
                const done = step.key === 'verificacionPasada'
                  ? (t.verificacionAprobada === true || !!t[step.key])
                  : !!t[step.key];
                const isSpecial = step.key === 'terminosAceptados' && t.terminosAprobadoPor === 'anfitrion';
                const isLast = si === STEPS.length - 1;
                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: done ? (isSpecial ? theme.colors.secondary : theme.colors.success) : theme.colors.border,
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    />
                    {!isLast && (
                      <span style={{ flex: 1, height: '2px', background: done ? theme.colors.success : theme.colors.borderLight }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
