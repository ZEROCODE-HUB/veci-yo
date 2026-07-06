import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import avatarDefault from '../../assets/avatars/perfil-default.png';
import iconSeguridad from '../../assets/icons/perfil/seguridad.png';
import iconSOS from '../../assets/icons/perfil/sos.png';

const ROL_NOMBRES = {
  guardia: 'Demo Seguridad',
  administrador: 'Demo Administrador',
  'inquilino-lider': 'Demo Inquilino Líder',
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

function nombreUsuario(usuario, rolActivo, modo) {
  if (usuario?.nombre) return `${usuario.nombre} ${usuario.apellido || ''}`.trim();
  if (rolActivo) return ROL_NOMBRES[rolActivo] || 'Usuario demo';
  if (modo === 'incognito') return 'Invitado';
  return 'Usuario';
}

function TarjetaAccion({ icon, label, onPress }) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{
        ...cardStyle,
        flex: 1,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: theme.fonts.family,
      }}
    >
      <span style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: '#FEF3C7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img src={icon} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
        {label}
      </span>
    </button>
  );
}

function FilaOpcion({ emoji, label, onPress }) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{
        ...cardStyle,
        width: '100%',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: theme.fonts.family,
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: theme.fonts.sizes.base, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>
        {label}
      </span>
      <span style={{ fontSize: '18px', color: theme.colors.textMuted }}>→</span>
    </button>
  );
}

export default function PerfilPage() {
  const navigate = useNavigate();
  const { usuario, rolActivo, modo, addToast, cerrarSesion } = useApp();

  const nombre = nombreUsuario(usuario, rolActivo, modo);
  const enDesarrollo = () => {};

  const handleCerrarSesion = () => {
    cerrarSesion();
    navigate('/onboarding', { replace: true });
  };

  return (
    <AppShell>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Avatar + nombre + Configuración */}
        <div style={{ ...cardStyle, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${theme.colors.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E8E4DC',
            }}>
              <img src={avatarDefault} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <button
              type="button"
              onClick={enDesarrollo}
              aria-label="Cambiar foto de perfil"
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#fff',
                border: `1.5px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: theme.shadows.sm,
              }}
            >
              📷
            </button>
          </div>

          <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            {nombre}
          </h2>

          <button
            type="button"
            onClick={() => navigate('/configuracion')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: theme.radius.full,
              background: theme.colors.primary,
              color: theme.colors.text,
              fontWeight: theme.fonts.weights.semibold,
              fontSize: theme.fonts.sizes.md,
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
            }}
          >
            Configuración
          </button>
        </div>

        {/* Seguridad / S.O.S */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <TarjetaAccion icon={iconSeguridad} label="Seguridad" onPress={() => navigate('/perfil/seguridad')} />
          <TarjetaAccion icon={iconSOS} label="S.O.S" onPress={() => navigate('/perfil/sos')} />
        </div>

        {/* Soporte / Cerrar sesión */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FilaOpcion emoji="🎧" label="Soporte" onPress={() => navigate('/perfil/soporte')} />
          <FilaOpcion emoji="🚪" label="Cerrar sesión" onPress={handleCerrarSesion} />
        </div>

        <div style={{ height: '24px' }} />
      </div>
    </AppShell>
  );
}
