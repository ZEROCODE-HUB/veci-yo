import { useRef, useEffect } from 'react';
import theme from '../../config/theme';

/**
 * Tabs — Filtro tipo "tabs" estandarizado para móvil.
 *
 * Comportamiento único y consistente para TODA la app (ver StatusTabs, que
 * delega aquí, y los selectores de categoría/filtro de cada módulo):
 *  - Una sola fila. Nunca salta de línea ni se apila en varias filas.
 *  - Scroll horizontal cuando el contenido excede el ancho disponible.
 *  - Altura uniforme para todos los tabs.
 *  - Estado activo siempre visible (auto-scroll para centrar el seleccionado).
 *  - Nombres largos se acortan automáticamente (SHORT_LABELS) o vía `shortLabels`.
 *
 * `variant`:
 *  - 'status' → cada tab coloreado por su estado (badges/filtros de estado).
 *  - 'chip'   → estilo uniforme (selectores de categoría, unidades, etc.).
 */

// Colores por estado para la variante 'status'. Centralizado aquí para que
// todos los filtros de estado de la app compartan exactamente los mismos
// criterios visuales.
export const STATUS_COLORS = {
  'No Recibido':   { bg: theme.colors.primary,    color: theme.colors.text },
  'En Portería':   { bg: theme.colors.statusGray,  color: theme.colors.textSecondary },
  'Entregado':     { bg: theme.colors.secondary,   color: '#fff' },
  'Rechazado':     { bg: theme.colors.primary,     color: theme.colors.text },
  'Pendiente':     { bg: theme.colors.statusGray,  color: theme.colors.textSecondary },
  'En curso':      { bg: theme.colors.secondary,   color: '#fff' },
  'Completo':      { bg: theme.colors.success,     color: '#fff' },
  'Aceptado':      { bg: theme.colors.secondary,   color: '#fff' },
  'Reservado':     { bg: theme.colors.primary,     color: theme.colors.text },
  'No disponible': { bg: theme.colors.statusGray,  color: theme.colors.textSecondary },
  'Disponible':    { bg: theme.colors.secondary,   color: '#fff' },
  'Todos':         { bg: theme.colors.text,        color: '#fff' },
  'Todas':         { bg: theme.colors.text,        color: '#fff' },
  'Atrasado':      { bg: theme.colors.primary,      color: theme.colors.text },
  'Deudor':        { bg: theme.colors.statusGray,   color: theme.colors.textSecondary },
  'Al día':        { bg: theme.colors.secondary,    color: '#fff' },
  'Inscripto':     { bg: theme.colors.primary,      color: theme.colors.text },
  'No inscripto':  { bg: theme.colors.statusGray,   color: theme.colors.textSecondary },
};

// Acortado de etiquetas excesivamente largas para que entren en un tab de una
// línea. Solo afecta el texto mostrado; el valor real del filtro no cambia.
const SHORT_LABELS = {
  'No Recibido': 'No recib.',
  'En Portería': 'Portería',
  'No disponible': 'No disp.',
  'No inscripto': 'No inscr.',
  'Amigos Familiares': 'Amigos',
  'Profesional Temporal': 'Prof. Temp.',
  'Profesional Permanente': 'Prof. Perm.',
  'Huésped Temporal': 'Huésped',
  'Residente Permanente': 'Residente',
};

export default function Tabs({
  tabs,
  active,
  onChange,
  variant = 'chip',
  statusColors = {},
  centered = false,
  allowDeselect = true,
  shortLabels = {},
}) {
  const scrollRef = useRef(null);
  const itemRefs = useRef({});

  const items = tabs.map(t =>
    typeof t === 'string'
      ? { value: t, label: shortLabels[t] || SHORT_LABELS[t] || t }
      : { value: t.value, label: t.label }
  );

  // Auto-scroll: mantener el tab activo visible (centrado dentro de la fila).
  useEffect(() => {
    const el = itemRefs.current[active];
    const container = scrollRef.current;
    if (!el || !container) return;
    const elLeft = el.offsetLeft;
    const elRight = elLeft + el.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    if (elLeft < viewLeft || elRight > viewRight) {
      const target = elLeft - (container.clientWidth - el.offsetWidth) / 2;
      container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [active]);

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        justifyContent: centered ? 'center' : 'flex-start',
        padding: '2px 0',
      }}
    >
      {items.map(({ value, label }) => {
        const isActive = active === value;

        let bg, color, border, opacity;
        if (variant === 'status') {
          const colors =
            statusColors[value] || STATUS_COLORS[value] || { bg: theme.colors.primary, color: theme.colors.text };
          bg = colors.bg;
          color = colors.color;
          border = isActive ? `2.5px solid ${theme.colors.text}` : '2.5px solid transparent';
          opacity = isActive ? 1 : 0.6;
        } else {
          bg = isActive ? theme.colors.primary : theme.colors.bgCard;
          color = theme.colors.text;
          border = isActive ? `2px solid ${theme.colors.text}` : `1.5px solid ${theme.colors.border}`;
          opacity = 1;
        }

        return (
          <button
            key={value}
            ref={el => { itemRefs.current[value] = el; }}
            onClick={() => onChange(isActive && allowDeselect ? null : value)}
            title={value}
            style={{
              flexShrink: 0,
              height: '34px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 14px',
              borderRadius: theme.radius.full,
              fontSize: theme.fonts.sizes.sm,
              fontWeight: theme.fonts.weights.semibold,
              fontFamily: theme.fonts.family,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 150ms',
              background: bg,
              color,
              border,
              opacity,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
