import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import iconCorrespondencia from '../../assets/icons/home/correspondencia.png';
import iconVisitas from '../../assets/icons/home/visitas.png';
import iconZonasComunes from '../../assets/icons/home/zonascomunes.png';
import iconAnuncios from '../../assets/icons/home/anuncios.png';
import iconRanking from '../../assets/icons/home/ranking.png';
import iconReglas from '../../assets/icons/home/reglas.png';
import avatarMessaging from '../../assets/avatars/messaging.png';
import avatarChat from '../../assets/avatars/chat.png';
import avatarCall from '../../assets/avatars/call.png';

// Panel de "Configuración" del Administrador — un componente desplegable
// in-place, no pantallas separadas. Sumar/quitar una sección del flujo de
// Administrador es solo editar este array.
const CONFIG_ADMIN_OPCIONES = [
  { key: 'arquitectura', label: 'ARQUITECTURA', path: '/admin/arquitectura' },
  { key: 'permisos', label: 'PERMISOS', path: '/admin/permisos' },
  { key: 'seguridad', label: 'SEGURIDAD', path: '/admin/seguridad' },
  { key: 'integracion', label: 'INTEGRACIÓN EXTERNA', path: '/integracion-externa' },
];

const modules = [
  { label: 'Correspondencia', emoji: '📬', icon: iconCorrespondencia, bg: '#FEF3C7', path: '/correspondencia' },
  { label: 'Visitas',         emoji: '🗝️',  icon: iconVisitas,         bg: '#FEF3C7', path: '/visitas' },
  { label: 'Zonas Comunes',   emoji: '🏋️', icon: iconZonasComunes,    bg: '#FEF3C7', path: '/zonas-comunes' },
  { label: 'Anuncios',        emoji: '📣',  icon: iconAnuncios,        bg: '#FEF3C7', path: '/anuncios' },
  { label: 'Ranking',         emoji: '🏆',  icon: iconRanking,         bg: '#FEF3C7', path: '/ranking' },
  { label: 'Reglas',          emoji: null,  icon: iconReglas,          bg: '#FEF3C7', path: '/reglas', isReglas: true },
];

function ReglasThumbnail() {
  return (
    <div style={{
      width: '64px',
      height: '80px',
      background: '#F5F0E8',
      borderRadius: '4px',
      border: '1px solid #D4C9B0',
      padding: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textAlign: 'center', color: '#333' }}>REGLAS</div>
      {Array.from({length: 5}).map((_,i) => (
        <div key={i} style={{ height: '4px', background: '#C9B99A', borderRadius: '2px' }} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [iconosOriginales, setIconosOriginales] = useState(false);
  const { usuario, mostrarBienvenida, cerrarBienvenida, rolActivo } = useApp();
  const esAdministrador = rolActivo === 'administrador';

  const handleConfiguracion = () => {
    if (esAdministrador) setConfigOpen(o => !o);
    else if (rolActivo === 'propietario') navigate('/propietario/configuracion');
    else navigate('/configuracion');
  };

  const irAVerificacion = () => {
    cerrarBienvenida();
    navigate('/onboarding/verificacion');
  };

  return (
    <AppShell>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Building card */}
        <div
          style={{
            background: theme.colors.bgCard,
            borderRadius: theme.radius.xl,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            boxShadow: theme.shadows.card,
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${theme.colors.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#E8E4DC',
              fontSize: '60px',
            }}
          >
            🏢
          </div>
          <h2 style={{ fontSize: theme.fonts.sizes['2xl'], fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            Vivienda
          </h2>
          <button
            onClick={handleConfiguracion}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: esAdministrador && configOpen ? `${theme.radius.full} ${theme.radius.full} 0 0` : theme.radius.full,
              background: theme.colors.primary,
              color: theme.colors.text,
              fontWeight: theme.fonts.weights.semibold,
              fontSize: theme.fonts.sizes.md,
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              position: 'relative',
            }}
          >
            Configuración
            {esAdministrador && (
              <span style={{
                position: 'absolute',
                right: '18px',
                top: '50%',
                transform: `translateY(-50%) rotate(${configOpen ? 180 : 0}deg)`,
                transition: 'transform 200ms',
                fontSize: '14px',
              }}>
                ↓
              </span>
            )}
          </button>

          {/* Panel desplegable del Administrador — componente in-place, no rutas nuevas para abrirlo */}
          {esAdministrador && configOpen && (
            <div style={{ width: '100%', marginTop: '-12px', display: 'flex', flexDirection: 'column', animation: 'slideDown 200ms ease' }}>
              {CONFIG_ADMIN_OPCIONES.map((op, i) => (
                <button
                  key={op.key}
                  onClick={() => { setConfigOpen(false); navigate(op.path); }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: theme.colors.primary,
                    color: theme.colors.text,
                    fontWeight: theme.fonts.weights.bold,
                    fontSize: theme.fonts.sizes.sm,
                    letterSpacing: '0.04em',
                    border: 'none',
                    borderTop: '1px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    fontFamily: theme.fonts.family,
                    borderRadius: i === CONFIG_ADMIN_OPCIONES.length - 1 ? `0 0 ${theme.radius.full} ${theme.radius.full}` : 0,
                  }}
                >
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Module grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {modules.map(mod => (
            <button
              key={mod.label}
              onClick={() => navigate(mod.path)}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: theme.shadows.card,
                border: 'none',
                cursor: 'pointer',
                minHeight: '120px',
                fontFamily: theme.fonts.family,
              }}
            >
              {iconosOriginales ? (
                mod.isReglas ? <ReglasThumbnail /> : <span style={{ fontSize: '64px', lineHeight: 1 }}>{mod.emoji}</span>
              ) : (
                <img src={mod.icon} alt={mod.label} style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
              )}
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
                {mod.label}
              </span>
            </button>
          ))}
        </div>

        {/* Toggle discreto para comparar el set de iconos nuevo vs. el original */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setIconosOriginales(o => !o)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.fonts.sizes.xs,
              color: theme.colors.textMuted,
              textDecoration: 'underline',
              fontFamily: theme.fonts.family,
              padding: '2px 8px',
            }}
          >
            {iconosOriginales ? 'Ver iconos nuevos' : 'Ver iconos originales'}
          </button>
        </div>

        {/* Bottom spacing for FABs */}
        <div style={{ height: '80px' }} />
      </div>

      {/* FABs */}
      {fabOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 400,
          }}
          onClick={() => setFabOpen(false)}
        />
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '12px',
          zIndex: 500,
        }}
      >
        {fabOpen && (
          <>
            {/* Llamar FAB */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideDown 150ms ease' }}>
              <span style={{
                background: '#fff',
                borderRadius: theme.radius.lg,
                padding: '6px 12px',
                fontSize: theme.fonts.sizes.sm,
                fontWeight: theme.fonts.weights.medium,
                boxShadow: theme.shadows.card,
                color: theme.colors.text,
              }}>
                Llamar
              </span>
              <button
                onClick={() => { setFabOpen(false); navigate('/llamar'); }}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: theme.colors.success,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
                  overflow: 'hidden',
                }}
              >
                <img src={avatarCall} alt="Llamar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            </div>

            {/* Chat FAB */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideDown 200ms ease' }}>
              <span style={{
                background: '#fff',
                borderRadius: theme.radius.lg,
                padding: '6px 12px',
                fontSize: theme.fonts.sizes.sm,
                fontWeight: theme.fonts.weights.medium,
                boxShadow: theme.shadows.card,
                color: theme.colors.text,
              }}>
                Chat
              </span>
              <button
                onClick={() => { setFabOpen(false); navigate('/chat'); }}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: theme.colors.primary,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: theme.shadows.fab,
                  overflow: 'hidden',
                }}
              >
                <img src={avatarChat} alt="Chat" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            </div>
          </>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: fabOpen ? theme.colors.text : theme.colors.secondary,
            color: '#fff',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxShadow: theme.shadows.md,
            transition: 'background 200ms, transform 200ms',
            transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            overflow: 'hidden',
          }}
        >
          {fabOpen ? '✕' : <img src={avatarMessaging} alt="Mensaje" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </button>
      </div>

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
