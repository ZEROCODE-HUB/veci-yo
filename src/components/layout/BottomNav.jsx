import { useNavigate, useLocation } from 'react-router-dom';
import theme from '../../config/theme';

const tabs = [
  {
    key: 'inicio',
    label: 'Inicio',
    path: '/',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.navActive : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'comunidad',
    label: 'Comunidad',
    path: '/comunidad',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.navActive : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'viviendas',
    label: 'Viviendas',
    path: '/',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? theme.colors.navActive : 'none'} stroke={active ? theme.colors.navActive : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
        <path d="M6 8h3M6 12h3M6 16h3M15 8h3M15 12h3M15 16h3"/>
      </svg>
    ),
    isCentral: true,
  },
  {
    key: 'pagos',
    label: 'Pagos',
    path: '/pagos',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.navActive : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'perfil',
    label: 'Perfil',
    path: '/perfil',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? theme.colors.navActive : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (tab) => {
    if (tab.key === 'viviendas') return ['/', '/correspondencia', '/visitas', '/zonas-comunes', '/llamar', '/chat'].some(p => location.pathname.startsWith(p));
    return location.pathname === tab.path;
  };

  return (
    <nav
      style={{
        display: 'flex',
        background: theme.colors.navBg,
        borderTop: `1px solid ${theme.colors.borderLight}`,
        padding: '8px 0 12px',
        flexShrink: 0,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {tabs.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              position: 'relative',
            }}
          >
            {tab.isCentral ? (
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: active ? theme.colors.primary : theme.colors.bgMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '-16px',
                  boxShadow: active ? theme.shadows.fab : 'none',
                }}
              >
                {tab.icon(active)}
              </div>
            ) : (
              tab.icon(active)
            )}
            <span
              style={{
                fontSize: theme.fonts.sizes.xs,
                fontWeight: active ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                color: active ? theme.colors.navActive : theme.colors.navInactive,
                fontFamily: theme.fonts.family,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
