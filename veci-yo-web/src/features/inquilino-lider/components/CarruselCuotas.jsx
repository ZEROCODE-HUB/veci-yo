import { useRef, useState } from 'react';
import theme from '../../../config/theme';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

export default function CarruselCuotas({ historial }) {
  const trackRef = useRef(null);
  const [activo, setActivo] = useState(0);

  const irA = (idx) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[idx];
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const manejarScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const centro = track.scrollLeft + track.offsetWidth / 2;
    let mejor = 0;
    let mejorDist = Infinity;
    for (let i = 0; i < track.children.length; i++) {
      const card = track.children[i];
      const cardCentro = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCentro - centro);
      if (dist < mejorDist) {
        mejorDist = dist;
        mejor = i;
      }
    }
    setActivo(mejor);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, padding: '0 2px' }}>
        Cuota de administración por mes
      </span>

      <div
        ref={trackRef}
        onScroll={manejarScroll}
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {historial.map((h) => (
          <div
            key={h.mes}
            style={{
              ...cardStyle,
              scrollSnapAlign: 'center',
              flex: '0 0 82%',
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '2px' }}>
                {h.mes} — Cuota de administración
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: theme.fonts.weights.bold,
                color: h.porcentaje >= 80 ? theme.colors.success : h.porcentaje >= 50 ? theme.colors.primary : theme.colors.danger,
              }}>
                {h.porcentaje}%
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
                ${h.recibido.toLocaleString()} de ${h.esperado.toLocaleString()} recibido
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                  <span>Al día</span>
                  <span>{h.alDia} / {h.alDia + h.atrasados}</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                  <div style={{ width: `${(h.alDia / (h.alDia + h.atrasados)) * 100}%`, height: '100%', background: theme.colors.success, borderRadius: theme.radius.full }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                  <span>Con retraso / Deudor</span>
                  <span>{h.atrasados} / {h.alDia + h.atrasados}</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                  <div style={{ width: `${(h.atrasados / (h.alDia + h.atrasados)) * 100}%`, height: '100%', background: theme.colors.dangerLight || '#FECACA', borderRadius: theme.radius.full }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {historial.map((h, i) => (
          <button
            key={h.mes}
            type="button"
            onClick={() => irA(i)}
            aria-label={`Ver ${h.mes}`}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: i === activo ? theme.colors.primary : theme.colors.border,
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>
    </div>
  );
}
