import { useState, useRef, useEffect } from 'react';
import theme from '../../config/theme';

export default function SelectField({ label, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const normalized = (options || []).map(opt =>
    typeof opt === 'object' && opt !== null && 'value' in opt
      ? opt
      : { value: opt, label: opt }
  );

  const selected = normalized.find(o => o.value === value);
  const display = selected ? selected.label : (label || placeholder || 'Seleccione...');

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%',
          background: theme.colors.bgCard,
          borderRadius: theme.radius['2xl'],
          padding: '13px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: open ? theme.shadows.md : theme.shadows.card,
          border: `1.5px solid ${open ? theme.colors.borderFocus : theme.colors.border}`,
          cursor: 'pointer',
          fontFamily: theme.fonts.family,
          textAlign: 'left',
          transition: `border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast}`,
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: theme.fonts.sizes.base,
            color: selected ? theme.colors.text : theme.colors.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {display}
        </span>
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: `transform ${theme.transitions.fast}` }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: theme.colors.bgCard,
            borderRadius: theme.radius.xl,
            border: `1px solid ${theme.colors.border}`,
            boxShadow: theme.shadows.lg,
            overflow: 'hidden',
            zIndex: 60,
            maxHeight: '260px',
            overflowY: 'auto',
            animation: 'slideDown 150ms ease',
          }}
        >
          {normalized.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '13px 16px',
                  fontSize: theme.fonts.sizes.base,
                  fontWeight: isSelected ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                  color: isSelected ? theme.colors.text : theme.colors.textSecondary,
                  background: isSelected ? theme.colors.primaryLight : 'transparent',
                  border: 'none',
                  borderBottom: i === normalized.length - 1 ? 'none' : `1px solid ${theme.colors.borderLight}`,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  transition: `background ${theme.transitions.fast}`,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = theme.colors.bgMuted; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}