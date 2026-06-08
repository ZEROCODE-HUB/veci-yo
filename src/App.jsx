import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';

// Onboarding
import LoginPage from './features/onboarding/LoginPage';
import RegistroPage from './features/onboarding/RegistroPage';
import VerificacionPage from './features/onboarding/VerificacionPage';
import DemoRolePage from './features/onboarding/DemoRolePage';

// Home
import HomePage from './features/home/HomePage';
import CallPage from './features/home/CallPage';
import CallInProgressPage from './features/home/CallInProgressPage';
import ChatPage from './features/home/ChatPage';

// Correspondencia
import CorrespondenciaPage from './features/correspondencia/CorrespondenciaPage';
import CorrespondenciaAgregarPage from './features/correspondencia/CorrespondenciaAgregarPage';

// Visitas
import VisitasHistorialPage from './features/visitas/VisitasHistorialPage';
import VisitasNuevoPage from './features/visitas/VisitasNuevoPage';

// Zonas Comunes
import ZonasComunesPage from './features/zonas/ZonasComunesPage';
import ZonaDetallesPage from './features/zonas/ZonaDetallesPage';
import ZonaReservarPage from './features/zonas/ZonaReservarPage';

// Placeholder pages
function PlaceholderPage({ title }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '16px',
      color: '#6B7280',
      fontFamily: 'Inter, sans-serif',
      padding: '32px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px' }}>🚧</div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>{title}</h2>
      <p style={{ fontSize: '14px', color: '#6B7280' }}>Esta sección está en desarrollo</p>
    </div>
  );
}

// Punto de entrada único: sin sesión, todo enruta a /onboarding. El resto
// de la app vive detrás de esta puerta — agregar nuevas rutas protegidas
// es solo anidarlas bajo este layout-route, sin repetir la verificación.
function RequireAuth() {
  const { autenticado } = useApp();
  if (!autenticado) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Onboarding — punto de entrada para todos los roles */}
      <Route path="/onboarding" element={<LoginPage />} />
      <Route path="/onboarding/registro" element={<RegistroPage />} />
      <Route path="/demo/:rol" element={<DemoRolePage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/llamar" element={<CallPage />} />
        <Route path="/llamar/en-curso" element={<CallInProgressPage />} />
        <Route path="/chat" element={<ChatPage />} />

        <Route path="/onboarding/verificacion" element={<VerificacionPage />} />

        <Route path="/correspondencia" element={<CorrespondenciaPage />} />
        <Route path="/correspondencia/agregar" element={<CorrespondenciaAgregarPage />} />

        <Route path="/visitas" element={<VisitasHistorialPage />} />
        <Route path="/visitas/nuevo" element={<VisitasNuevoPage />} />

        <Route path="/zonas-comunes" element={<ZonasComunesPage />} />
        <Route path="/zonas-comunes/:zonaId" element={<ZonaDetallesPage />} />
        <Route path="/zonas-comunes/:zonaId/reservar" element={<ZonaReservarPage />} />

        <Route path="/comunidad" element={<PlaceholderPage title="Comunidad" />} />
        <Route path="/pagos" element={<PlaceholderPage title="Pagos" />} />
        <Route path="/perfil" element={<PlaceholderPage title="Perfil" />} />
        <Route path="/configuracion" element={<PlaceholderPage title="Configuración" />} />
        <Route path="/anuncios" element={<PlaceholderPage title="Anuncios" />} />
        <Route path="/ranking" element={<PlaceholderPage title="Ranking" />} />
        <Route path="/reglas" element={<PlaceholderPage title="Reglas" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
