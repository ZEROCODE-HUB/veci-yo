import { useState } from 'react';
import theme from '../../config/theme';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Calendar({ selected, onSelect }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selected ? new Date(selected) : today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d) => {
    if (!selected || !d) return false;
    const s = new Date(selected);
    return s.getFullYear() === year && s.getMonth() === month && s.getDate() === d;
  };

  const isToday = (d) => {
    return d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div
      style={{
        background: theme.colors.bgCard,
        borderRadius: theme.radius.lg,
        padding: '16px',
        boxShadow: theme.shadows.card,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, padding: '4px 8px' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: theme.colors.danger, fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.sm }}>{year}</div>
          <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base }}>{MONTHS[month]}</div>
        </div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, padding: '4px 8px' }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, padding: '4px 0', fontWeight: theme.fonts.weights.semibold }}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const sel = isSelected(d);
          const tod = isToday(d);
          return (
            <button
              key={i}
              onClick={() => d && onSelect && onSelect(new Date(year, month, d))}
              disabled={!d}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%',
                fontSize: theme.fonts.sizes.sm,
                fontWeight: tod || sel ? theme.fonts.weights.bold : theme.fonts.weights.normal,
                background: sel ? theme.colors.danger : 'none',
                color: sel ? '#fff' : tod ? theme.colors.danger : d ? theme.colors.text : 'transparent',
                border: 'none',
                cursor: d ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: theme.fonts.family,
              }}
            >
              {d || ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
