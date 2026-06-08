import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Modal from '../../components/ui/Modal';
import OnboardingHeader from './components/OnboardingHeader';
import GoogleIcon from './components/GoogleIcon';
import { DEMO_ROLES } from './demoRoles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: theme.fonts.family,
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
  padding: '6px',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { iniciarSesion, ingresarIncognito } = useApp();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errors, setErrors] = useState({});

  const [showRecuperar, setShowRecuperar] = useState(false);
  const [recuperarCorreo, setRecuperarCorreo] = useState('');
  const [recuperarEnviado, setRecuperarEnviado] = useState(false);
  const [recuperarError, setRecuperarError] = useState('');

  const validar = () => {
    const next = {};
    if (!correo.trim()) next.correo = 'Ingresa tu correo electrónico';
    else if (!EMAIL_RE.test(correo.trim())) next.correo = 'Ingresa un correo válido';
    if (!contrasena) next.contrasena = 'Ingresa tu contraseña';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const entrarAlInicio = () => navigate('/', { replace: true });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!validar()) return;
    iniciarSesion({ correo: correo.trim() });
    entrarAlInicio();
  };

  const handleGoogle = () => {
    iniciarSesion({ correo: 'usuario@gmail.com' });
    entrarAlInicio();
  };

  const handleIncognito = () => {
    ingresarIncognito();
    entrarAlInicio();
  };

  const closeRecuperar = () => {
    setShowRecuperar(false);
    setTimeout(() => {
      setRecuperarCorreo('');
      setRecuperarEnviado(false);
      setRecuperarError('');
    }, 200);
  };

  const handleEnviarRecuperacion = () => {
    if (!recuperarCorreo.trim() || !EMAIL_RE.test(recuperarCorreo.trim())) {
      setRecuperarError('Ingresa un correo válido');
      return;
    }
    setRecuperarError('');
    setRecuperarEnviado(true);
  };

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme.colors.bgApp,
      fontFamily: theme.fonts.family,
    }}>
      <OnboardingHeader />

      <form onSubmit={handleLogin} style={{ flex: 1, padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Hero card */}
        <div style={{
          background: theme.colors.bgCard,
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
          boxShadow: theme.shadows.card,
        }}>
          <div style={{
            height: '150px',
            background: `linear-gradient(135deg, ${theme.colors.primaryLight}, #E8E4DC)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '56px',
          }}>
            🏡
          </div>
          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{
              textAlign: 'center',
              fontSize: theme.fonts.sizes.base,
              fontWeight: theme.fonts.weights.semibold,
              color: theme.colors.text,
              lineHeight: theme.fonts.lineHeights.snug,
            }}>
              Tu app gratuita para llevar tus relaciones vecinales
            </p>
            <Button type="button" variant="blue" fullWidth onClick={handleIncognito}>
              Ingresar de incógnito
            </Button>
          </div>
        </div>

        {/* Login form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField
            label="Correo"
            value={correo}
            onChange={(v) => { setCorreo(v); if (errors.correo) setErrors(prev => ({ ...prev, correo: '' })); }}
            placeholder="tu@correo.com"
            type="email"
            error={errors.correo}
            showEditIcon={false}
          />
          <InputField
            label="Contraseña"
            value={contrasena}
            onChange={(v) => { setContrasena(v); if (errors.contrasena) setErrors(prev => ({ ...prev, contrasena: '' })); }}
            placeholder="••••••••"
            type="password"
            error={errors.contrasena}
            showEditIcon={false}
          />

          <Button type="submit" variant="primary" fullWidth>Iniciar sesión</Button>

          <Button type="button" variant="secondary" fullWidth onClick={handleGoogle} style={{ gap: '10px' }}>
            Iniciar sesión con Google <GoogleIcon />
          </Button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <button type="button" style={linkButtonStyle} onClick={() => navigate('/onboarding/registro')}>
              Registrarse
            </button>
            <button type="button" style={linkButtonStyle} onClick={() => setShowRecuperar(true)}>
              Recuperar contraseña
            </button>
          </div>
        </div>

        {/* Demo entry points — config-driven, escalable a futuros roles */}
        {DEMO_ROLES.length > 0 && (
          <div style={{ marginTop: '8px', paddingTop: '18px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
            <p style={{
              textAlign: 'center',
              fontSize: theme.fonts.sizes['2xs'],
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: theme.fonts.weights.bold,
              color: theme.colors.textMuted,
              marginBottom: '12px',
            }}>
              Explorar otros roles
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEMO_ROLES.map(rol => (
                <Button
                  key={rol.key}
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate(`/demo/${rol.key}`)}
                  style={{ gap: '10px' }}
                >
                  <span style={{ fontSize: '18px' }}>{rol.emoji}</span> {rol.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Recuperar contraseña */}
      <Modal isOpen={showRecuperar} onClose={closeRecuperar} title="Recuperar contraseña">
        {recuperarEnviado ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: '44px' }}>📩</span>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
              Si <strong>{recuperarCorreo.trim()}</strong> está registrado, te enviamos instrucciones para restablecer tu contraseña.
            </p>
            <Button fullWidth onClick={closeRecuperar}>Aceptar</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
              Ingresa el correo asociado a tu cuenta y te enviaremos instrucciones para recuperar el acceso.
            </p>
            <InputField
              label="Correo"
              value={recuperarCorreo}
              onChange={(v) => { setRecuperarCorreo(v); if (recuperarError) setRecuperarError(''); }}
              placeholder="tu@correo.com"
              type="email"
              error={recuperarError}
              showEditIcon={false}
            />
            <Button fullWidth onClick={handleEnviarRecuperacion}>Enviar instrucciones</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
