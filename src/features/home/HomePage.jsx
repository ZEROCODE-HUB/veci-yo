import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import ViviendaResumen from './components/ViviendaResumen';
import CommsFab from './components/CommsFab';
import InquilinoLiderHome from './components/InquilinoLiderHome';

export default function HomePage() {
  const navigate = useNavigate();
  const { usuario, mostrarBienvenida, cerrarBienvenida, rolActivo, esIncognito } = useApp();
  const mostrarHomeLider = rolActivo === 'inquilino-lider' || rolActivo === 'propietario' || rolActivo === 'guardia' || esIncognito;

  const irAVerificacion = () => {
    cerrarBienvenida();
    navigate('/onboarding/verificacion');
  };

  return (
    <AppShell>
      {mostrarHomeLider ? (
        <InquilinoLiderHome />
      ) : (
        <>
          <ViviendaResumen />
          <CommsFab />
        </>
      )}

      {/* Bienvenida — aparece sobre el Home real tras registrarse, con el nombre ingresado */}
      <Modal isOpen={mostrarBienvenida} onClose={cerrarBienvenida} showClose={false}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '48px' }}>🎉</span>
          <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            ¡Bienvenido{usuario?.nombre ? `, ${usuario.nombre}` : ''}!
          </h2>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Tu cuenta fue creada con éxito. Para desbloquear todas las funciones de tu vivienda, verifica tu identidad.
          </p>
          <Button variant="primary" fullWidth onClick={irAVerificacion}>Iniciar verificación</Button>
          <Button variant="ghost" fullWidth onClick={cerrarBienvenida}>Más tarde</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
