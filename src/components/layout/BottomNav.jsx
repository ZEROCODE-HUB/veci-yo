import { useNavigate, useLocation } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';

// Tabs habilitados en esta fase — el resto se muestra atenuado y
// notifica que la funcionalidad está en desarrollo al pulsarlos.
const TABS_HABILITADOS = ['inicio', 'comunidad', 'viviendas', 'perfil'];

// El Inquilino Líder tiene una pantalla de Inicio (reputación/agenda)
// distinta de la de Vivienda, así que su tab "Viviendas" apunta a una
// ruta propia. El resto de roles mantiene "/" para ambos tabs.
const VIVIENDAS_PATH = { 'inquilino-lider': '/vivienda' };

const ACTIVE_GRADIENT_ID = 'bottomNavActiveGradient';
const activeStroke = `url(#${ACTIVE_GRADIENT_ID})`;

const tabs = [
  {
    key: 'inicio',
    label: 'Inicio',
    path: '/',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? activeStroke : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? activeStroke : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? activeStroke : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="1.5"/>
        <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/>
        <path d="M8 7h.01M8 11h.01M16 7h.01M16 11h.01"/>
      </svg>
    ),
  },
  {
    key: 'pagos',
    label: 'Pagos',
    path: '/pagos',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? activeStroke : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2"/>
        <path d="M15 12h6v4h-6a2 2 0 0 1 0-4z"/>
      </svg>
    ),
  },
  {
    key: 'perfil',
    label: 'Perfil',
    path: '/perfil',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? activeStroke : theme.colors.navInactive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, rolActivo } = useApp();

  const viviendasPath = VIVIENDAS_PATH[rolActivo] || '/';

  const isActive = (tab) => {
    if (tab.key === 'viviendas') return [viviendasPath, '/correspondencia', '/visitas', '/zonas-comunes', '/llamar', '/chat'].some(p => location.pathname.startsWith(p));
    if (tab.key === 'inicio') return location.pathname === '/';
    return location.pathname === tab.path;
  };

  const handlePress = (tab) => {
    if (!TABS_HABILITADOS.includes(tab.key)) { addToast('Funcionalidad en desarrollo'); return; }
    navigate(tab.key === 'viviendas' ? viviendasPath : tab.path);
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
      {/* Shared gradient definition referenced by every icon's stroke when active (gold -> dark gold) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id={ACTIVE_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.colors.primary} />
            <stop offset="100%" stopColor={theme.colors.primaryDark} />
          </linearGradient>
        </defs>
      </svg>

      {tabs.map(tab => {
        const active = isActive(tab);
        const habilitado = TABS_HABILITADOS.includes(tab.key);
        return (
          <button
            key={tab.key}
            onClick={() => handlePress(tab)}
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
              opacity: habilitado ? 1 : 0.4,
            }}
          >
            {tab.icon(active)}
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
