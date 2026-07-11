import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useApp } from './context/AppContext';

// Onboarding
import LoginPage from './features/onboarding/LoginPage';
import RegistroPage from './features/onboarding/RegistroPage';
import VerificacionPage from './features/onboarding/VerificacionPage';
import DemoRolePage from './features/onboarding/DemoRolePage';
import TerminosLegalesPage from './features/onboarding/TerminosLegalesPage';

// Home
import HomePage from './features/home/HomePage';
import ViviendaPage from './features/home/ViviendaPage';
import CallPage from './features/home/CallPage';
import CallInProgressPage from './features/home/CallInProgressPage';
import ChatPage from './features/home/ChatPage';
import NotificacionesPage from './features/home/NotificacionesPage';
import PerfilPage from './features/home/PerfilPage';

// Perfil · Seguridad y Soporte
import ConfiguracionPage from './features/perfil/ConfiguracionPage';
import SeguridadPage from './features/perfil/SeguridadPage';
import SOSPage from './features/perfil/SOSPage';
import SoportePage from './features/perfil/SoportePage';
import PreguntasFrecuentesPage from './features/perfil/PreguntasFrecuentesPage';
import ContactoSoportePage from './features/perfil/ContactoSoportePage';
import ReclamosPage from './features/perfil/ReclamosPage';
import ReclamoNuevoPage from './features/perfil/ReclamoNuevoPage';
import ReclamoDetallePage from './features/perfil/ReclamoDetallePage';

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

// Administrador
import AdministradorArquitecturaPage from './features/administrador/AdministradorArquitecturaPage';
import AdministradorPermisosPage from './features/administrador/AdministradorPermisosPage';
import AdministradorSeguridadPage from './features/administrador/AdministradorSeguridadPage';
import AdministradorUbicacionPage from './features/administrador/AdministradorUbicacionPage';
import AdministradorZonasPage from './features/administrador/AdministradorZonasPage';
import AdministradorGestionZonasPage from './features/administrador/AdministradorGestionZonasPage';
import AdministradorGestionZonaFormPage from './features/administrador/AdministradorGestionZonaFormPage';
import AdministradorGestionZonaReservasPage from './features/administrador/AdministradorGestionZonaReservasPage';

// Propietario
import PropietarioConfiguracionPage from './features/propietario/PropietarioConfiguracionPage';
import PropietarioCrearRolPage from './features/propietario/PropietarioCrearRolPage';
import PropietarioHistorialContratoPage from './features/propietario/PropietarioHistorialContratoPage';
import PropietarioHuespedesTemporalesPage from './features/propietario/PropietarioHuespedesTemporalesPage';
import PropietarioAgregarServicioPage from './features/propietario/PropietarioAgregarServicioPage';

// Inquilino Líder
import AdministracionUbicacionPage from './features/inquilino-lider/AdministracionUbicacionPage';
import CuadroHonorPage from './features/inquilino-lider/CuadroHonorPage';
import ReputacionPage from './features/inquilino-lider/ReputacionPage';

// Anuncios
import AnunciosPage from './features/anuncios/AnunciosPage';
import AnuncioDetallePage from './features/anuncios/AnuncioDetallePage';

// Reglas
import ReglasPage from './features/reglas/ReglasPage';
import ReglaDetallePage from './features/reglas/ReglaDetallePage';

// Comunidad
import ComunidadPage from './features/comunidad/ComunidadPage';

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
      <Route path="/onboarding/terminos" element={<TerminosLegalesPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/vivienda" element={<ViviendaPage />} />
        <Route path="/administracion-ubicacion" element={<AdministracionUbicacionPage />} />
        <Route path="/cuadro-honor" element={<CuadroHonorPage />} />
        <Route path="/reputacion" element={<ReputacionPage />} />
        <Route path="/llamar" element={<CallPage />} />
        <Route path="/llamar/en-curso" element={<CallInProgressPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />

        <Route path="/onboarding/verificacion" element={<VerificacionPage />} />

        <Route path="/correspondencia" element={<CorrespondenciaPage />} />
        <Route path="/correspondencia/agregar" element={<CorrespondenciaAgregarPage />} />

        <Route path="/visitas" element={<VisitasHistorialPage />} />
        <Route path="/visitas/nuevo" element={<VisitasNuevoPage />} />

        <Route path="/zonas-comunes" element={<ZonasComunesPage />} />
        <Route path="/zonas-comunes/:zonaId" element={<ZonaDetallesPage />} />
        <Route path="/zonas-comunes/:zonaId/reservar" element={<ZonaReservarPage />} />

        <Route path="/admin/administracion-ubicacion" element={<AdministradorUbicacionPage />} />
        <Route path="/admin/arquitectura" element={<AdministradorArquitecturaPage />} />
        <Route path="/admin/permisos" element={<AdministradorPermisosPage />} />
        <Route path="/admin/seguridad" element={<AdministradorSeguridadPage />} />
        <Route path="/admin/zonas" element={<AdministradorZonasPage />} />
        <Route path="/admin/gestion-zonas" element={<AdministradorGestionZonasPage />} />
        <Route path="/admin/gestion-zonas/:id" element={<AdministradorGestionZonaFormPage />} />
        <Route path="/admin/gestion-zonas/:id/reservas" element={<AdministradorGestionZonaReservasPage />} />

        <Route path="/propietario/configuracion" element={<PropietarioConfiguracionPage />} />
        <Route path="/propietario/configuracion/crear-rol" element={<PropietarioCrearRolPage />} />
        <Route path="/propietario/configuracion/historial-contrato" element={<PropietarioHistorialContratoPage />} />
        <Route path="/propietario/configuracion/huespedes-temporales" element={<PropietarioHuespedesTemporalesPage />} />
        <Route path="/propietario/configuracion/agregar-servicio" element={<PropietarioAgregarServicioPage />} />

        {/* Inquilino líder · Configuración (misma pantalla y funcionalidades que Propietario) */}
        <Route path="/inquilino-lider/configuracion" element={<PropietarioConfiguracionPage basePath="/inquilino-lider/configuracion" />} />
        <Route path="/inquilino-lider/configuracion/crear-rol" element={<PropietarioCrearRolPage />} />
        <Route path="/inquilino-lider/configuracion/historial-contrato" element={<PropietarioHistorialContratoPage />} />
        <Route path="/inquilino-lider/configuracion/huespedes-temporales" element={<PropietarioHuespedesTemporalesPage />} />
        <Route path="/inquilino-lider/configuracion/agregar-servicio" element={<PropietarioAgregarServicioPage />} />
        <Route path="/integracion-externa" element={<PlaceholderPage title="Integración externa" />} />

        <Route path="/comunidad" element={<ComunidadPage />} />
        <Route path="/pagos" element={<PlaceholderPage title="Pagos" />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/perfil/seguridad" element={<SeguridadPage />} />
        <Route path="/perfil/sos" element={<SOSPage />} />
        <Route path="/perfil/soporte" element={<SoportePage />} />
        <Route path="/perfil/soporte/preguntas-frecuentes" element={<PreguntasFrecuentesPage />} />
        <Route path="/perfil/soporte/contacto" element={<ContactoSoportePage />} />
        <Route path="/perfil/soporte/reclamos" element={<ReclamosPage />} />
        <Route path="/perfil/soporte/reclamos/nuevo" element={<ReclamoNuevoPage />} />
        <Route path="/perfil/soporte/reclamos/:id" element={<ReclamoDetallePage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/anuncios" element={<AnunciosPage />} />
        <Route path="/anuncios/:id" element={<AnuncioDetallePage />} />
        <Route path="/ranking" element={<PlaceholderPage title="Ranking" />} />
        <Route path="/reglas" element={<ReglasPage />} />
        <Route path="/reglas/:tipo" element={<ReglaDetallePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
