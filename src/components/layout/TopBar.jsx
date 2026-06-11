import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { edificios, notificaciones } from '../../data/mockData';
import theme from '../../config/theme';
import Logo from '../ui/Logo';

const ROL_KEYS = { guardia: 'guardia', administrador: 'administrador' };

export default function TopBar() {
  const navigate = useNavigate();
  const { edificioActivo, setEdificioActivo, rolActivo, ubicaciones } = useApp();
  const [open, setOpen] = useState(false);

  const rolKey = ROL_KEYS[rolActivo] || 'residente';
  const hayNoLeidas = (notificaciones[rolKey] || []).some(n => !n.leida);

  // El Inquilino Líder administra varias ubicaciones; el header muestra su
  // alias favorito y lleva directo a "Administración de ubicación" en vez
  // del selector de edificios del resto de roles.
  const esInquilinoLider = rolActivo === 'inquilino-lider';
  const ubicacionFavorita = ubicaciones.find(u => u.favorito) || ubicaciones[0];
  const ubicacionLabel = esInquilinoLider ? ubicacionFavorita?.alias : edificioActivo;

  const handleLocationClick = () => {
    if (esInquilinoLider) navigate('/administracion-ubicacion');
    else setOpen(o => !o);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#fff',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        position: 'relative',
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Logo size={36} />
        <span style={{
          fontSize: theme.fonts.sizes.xl,
          fontWeight: theme.fonts.weights.bold,
          color: theme.colors.text,
          fontFamily: theme.fonts.family,
        }}>
          Veciyo
        </span>
      </div>

      {/* Building selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={handleLocationClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.text,
            fontWeight: theme.fonts.weights.medium,
            fontFamily: theme.fonts.family,
          }}
        >
          <span style={{ textDecoration: 'underline' }}>{ubicacionLabel}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {open && !esInquilinoLider && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#fff',
              borderRadius: theme.radius.md,
              boxShadow: theme.shadows.md,
              border: `1px solid ${theme.colors.border}`,
              minWidth: '200px',
              zIndex: 200,
              overflow: 'hidden',
              animation: 'slideDown 150ms ease',
            }}
          >
            {edificios.map(e => (
              <button
                key={e}
                onClick={() => { setEdificioActivo(e); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: e === edificioActivo ? theme.colors.primaryLight : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: theme.fonts.sizes.sm,
                  color: theme.colors.text,
                  fontFamily: theme.fonts.family,
                  borderBottom: `1px solid ${theme.colors.borderLight}`,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <button
        onClick={() => navigate('/notificaciones')}
        aria-label="Notificaciones"
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hayNoLeidas && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: theme.colors.danger,
            border: '2px solid #fff',
          }} />
        )}
      </button>
    </div>
  );
}
