import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import theme from '../../config/theme';

export default function Modal({ isOpen, onClose, title, children, showClose = true, headerAction }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.colors.bgOverlay,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 200ms ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: theme.radius.xl,
          width: '100%',
          maxWidth: '380px',
          overflow: 'visible',
          animation: 'scaleIn 200ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: `1px solid ${theme.colors.border}`,
            }}
          >
            {showClose ? (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: theme.colors.textSecondary,
                  marginRight: '12px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            ) : (
              <div style={{ width: '32px', marginRight: '12px', flexShrink: 0 }} />
            )}
            <h2
              style={{
                fontSize: theme.fonts.sizes.lg,
                fontWeight: theme.fonts.weights.bold,
                color: theme.colors.text,
                flex: 1,
                textAlign: 'center',
              }}
            >
              {title}
            </h2>
            {headerAction ? (
              <div style={{ marginLeft: '12px', flexShrink: 0 }}>{headerAction}</div>
            ) : (
              showClose ? <div style={{ width: '32px', marginLeft: '12px', flexShrink: 0 }} /> : null
            )}
          </div>
        )}
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
