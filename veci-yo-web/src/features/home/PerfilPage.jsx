import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import Toggle from '../../components/ui/Toggle';
import avatarDefault from '../../assets/avatars/perfil-default.png';
import iconSeguridad from '../../assets/icons/perfil/seguridad.png';
import iconSOS from '../../assets/icons/perfil/sos.png';
import { guardiasSeguridad as guardiasData } from '../../data/mockData';

const DIAS_SEMANA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ROL_NOMBRES = {
  guardia: 'Demo Seguridad',
  administrador: 'Demo Administrador',
  'inquilino-lider': 'Demo Residente Inquilino Lider',
  'huesped-temporal': 'Demo Huésped Temporal',
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

function obtenerTurnoActual(guardia) {
  if (!guardia?.turnos || guardia.turnos.length === 0) return null;
  const ahora = new Date();
  const diaActual = DIAS_SEMANA_ES[ahora.getDay()];
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  for (const t of guardia.turnos) {
    if (t.dia !== diaActual) continue;
    const partes = t.hora.split(' a ');
    if (partes.length !== 2) continue;
    const [hInicio, mInicio] = partes[0].split(':').map(Number);
    const [hFin, mFin] = partes[1].split(':').map(Number);
    const inicio = hInicio * 60 + mInicio;
    const fin = hFin * 60 + mFin;
    if (minutosActuales >= inicio && minutosActuales < fin) {
      return { dia: t.dia, hora: t.hora, finMinutos: fin, ahoraMinutos: minutosActuales };
    }
  }
  return null;
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
  const { usuario, rolActivo, modo, addToast, cerrarSesion, alias, usaAliasCuadroHonor, usaAliasZonas, actualizarAlias, sugerirAlias, guardias } = useApp();

  const nombre = nombreUsuario(usuario, rolActivo, modo);
  const enDesarrollo = () => {};
  const esGuardia = rolActivo === 'guardia';
  const guardiaActual = esGuardia ? guardiasData.find(g => g.nombre === (usuario?.nombre || 'Roberto Hornado')) : null;
  const turnoActual = guardiaActual ? obtenerTurnoActual(guardiaActual) : null;

  const [aliasLocal, setAliasLocal] = useState(alias || sugerirAlias());
  const [usaCuadroHonor, setUsaCuadroHonor] = useState(usaAliasCuadroHonor);
  const [usaZonas, setUsaZonas] = useState(usaAliasZonas);

  const guardarAlias = () => {
    actualizarAlias({ alias: aliasLocal.trim() || sugerirAlias(), cuadroHonor: usaCuadroHonor, zonas: usaZonas });
    addToast('Alias actualizado', 'success');
  };

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

        {/* Info SOS */}
        <div style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FEF3C7' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
          <span style={{ fontSize: theme.fonts.sizes.xs, color: '#92400E', lineHeight: 1.5 }}>
            El botón de S.O.S activa una alarma sonora en la aplicación que es recibida por todos los guardias de seguridad de turno en ese momento. Se brindan los datos de la persona que activó la alarma: departamento, nombre y demás datos relevantes.
          </span>
        </div>

        {/* Turno actual — solo para guardia */}
        {esGuardia && guardiaActual && (
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🕐</span>
              <h3 style={{ margin: 0, fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Mi Turno</h3>
            </div>
            {turnoActual ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estado:</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: '#16A34A', fontWeight: theme.fonts.weights.semibold }}>En turno activo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Horario:</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{turnoActual.hora}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Garita:</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{guardiaActual.garita}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estado:</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, fontWeight: theme.fonts.weights.medium }}>Sin turno activo</span>
                </div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  Tus turnos configurados: {guardiaActual.turnos.map(t => `${t.dia} ${t.hora}`).join(' · ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alias / Anonimato — oculto para guardia */}
        {!esGuardia && (
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Alias / Anonimato</h3>
              <p style={{ margin: '4px 0 0', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                Tu alias se muestra en lugar de tu nombre real en las secciones que elijas.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>Alias sugerido (editable)</label>
              <input
                value={aliasLocal}
                onChange={e => setAliasLocal(e.target.value)}
                placeholder={sugerirAlias()}
                style={{ padding: '12px 14px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, color: theme.colors.text, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Usar alias en Cuadro de Honor</span>
              <Toggle value={usaCuadroHonor} onChange={setUsaCuadroHonor} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Usar alias en Zonas Comunes y reservas</span>
              <Toggle value={usaZonas} onChange={setUsaZonas} />
            </div>

            <p style={{ margin: 0, fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, background: theme.colors.bgMuted, padding: '10px 12px', borderRadius: theme.radius.md }}>
              Seguridad y Administración siempre ven tu nombre real, sin importar el alias.
            </p>

            <button
              type="button"
              onClick={guardarAlias}
              style={{ width: '100%', padding: '12px', borderRadius: theme.radius.full, background: theme.colors.primary, color: theme.colors.text, fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.md, border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family }}
            >
              Guardar alias
            </button>
          </div>
        )}

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
