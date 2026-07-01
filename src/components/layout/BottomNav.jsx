import { useNavigate, useLocation } from 'react-router-dom';
import theme from '../../config/theme';

const TABS_HABILITADOS = ['inicio', 'viviendas', 'perfil'];

const tabs = [
  {
    key: 'inicio',
    label: 'Inicio',
    path: '/',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? theme.colors.navActive : 'none'} stroke={active ? 'none' : theme.colors.navInactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'viviendas',
    label: 'Viviendas',
    path: '/vivienda',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? theme.colors.navActive : 'none'} stroke={active ? 'none' : theme.colors.navInactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="1.5"/>
        <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/>
        <path d="M8 7h.01M8 11h.01M16 7h.01M16 11h.01"/>
      </svg>
    ),
  },
  {
    key: 'perfil',
    label: 'Perfil',
    path: '/perfil',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? theme.colors.navActive : 'none'} stroke={active ? 'none' : theme.colors.navInactive} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    if (tab.key === 'viviendas') return ['/vivienda', '/correspondencia', '/visitas', '/zonas-comunes', '/llamar', '/chat'].some(p => location.pathname.startsWith(p));
    if (tab.key === 'inicio') return location.pathname === '/';
    return location.pathname === tab.path;
  };

  const handlePress = (tab) => {
    navigate(tab.path);
  };

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        background: theme.colors.navBg,
        borderTop: `1px solid ${theme.colors.borderLight}`,
        padding: '6px 0 10px',
        flexShrink: 0,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
      }}
    >
      {tabs.map(tab => {
        const active = isActive(tab);
        const habilitado = TABS_HABILITADOS.includes(tab.key);
        return (
          <button
            key={tab.key}
            onClick={() => handlePress(tab)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 16px',
              opacity: habilitado ? 1 : 0.4,
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 28,
                borderRadius: 8,
                background: active ? `${theme.colors.navActive}18` : 'transparent',
                transition: 'background 0.2s',
              }}
            >
              {tab.icon(active)}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: active ? 600 : 500,
                color: active ? theme.colors.navActive : theme.colors.navInactive,
                fontFamily: theme.fonts.family,
                letterSpacing: '0.3px',
              }}
            >
              {tab.label}
            </span>
            {active && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 3,
                  borderRadius: '0 0 3px 3px',
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
