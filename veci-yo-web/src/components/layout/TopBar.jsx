import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { notificaciones } from '../../data/mockData';
import { HELP } from '../../config/helpContent';
import theme from '../../config/theme';
import Logo from '../ui/Logo';
import InfoButton from '../ui/InfoButton';

const ROL_KEYS = { guardia: 'guardia', administrador: 'administrador' };
const ADMINISTRAR_LABEL = 'Administrar mis ubicaciones';

export default function TopBar() {
  const navigate = useNavigate();
  const { rolActivo, ubicaciones, toggleFavoritoUbicacion, sinPropiedades, edificioActivo } = useApp();
  const [open, setOpen] = useState(false);

  const rolKey = ROL_KEYS[rolActivo] || 'residente';
  const hayNoLeidas = (notificaciones[rolKey] || []).some(n => !n.leida);

  // El selector de residencia es común a todos los perfiles: muestra la
  // residencia activa (la favorita, o la primera cargada) y al tocarla
  // despliega el resto. Sin ninguna residencia cargada el header invita a
  // administrarlas y lleva directo a "Administración de ubicación".
  const esGuardia = rolActivo === 'guardia';
  const esAdmin = rolActivo === 'administrador';
  const ubicacionActiva = ubicaciones.find(u => u.favorito) || ubicaciones[0];
  const sinUbicaciones = ubicaciones.length === 0;
  const ubicacionLabel = sinUbicaciones
    ? ADMINISTRAR_LABEL
    : esGuardia
      ? `Guardia ${edificioActivo || ubicacionActiva?.alias || ubicacionActiva?.direccion || ''}`
      : esAdmin
        ? `Administrador, ${ubicacionActiva?.alias || ubicacionActiva?.direccion || ''}`
        : (ubicacionActiva?.alias || ubicacionActiva?.direccion);

  const irAAdministrar = () => { setOpen(false); navigate('/administracion-ubicacion'); };

  const handleLocationClick = () => {
    if (sinUbicaciones) irAAdministrar();
    else setOpen(o => !o);
  };

  const seleccionarUbicacion = (id) => { toggleFavoritoUbicacion(id); setOpen(false); };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#fff',
        borderBottom: `1px solid ${theme.colors.borderLight}`,
        position: 'relative',
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Logo size={36} />
        <span style={{
          fontSize: theme.fonts.sizes.xl,
          fontWeight: theme.fonts.weights.bold,
          color: theme.colors.text,
          fontFamily: theme.fonts.family,
        }}>
          Veciyo
        </span>
      </div>

      {/* Building selector (selector de propiedades) */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '2px' }}>
        <button
          onClick={handleLocationClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.text,
            fontWeight: theme.fonts.weights.medium,
            fontFamily: theme.fonts.family,
          }}
        >
          <span style={{ textDecoration: 'underline' }}>{ubicacionLabel}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Ayuda contextual del selector de propiedades */}
        {sinPropiedades ? (
          <InfoButton
            variant="bloqueado"
            size={16}
            titulo={HELP.propiedades.bloqueo.titulo}
            descripcion={HELP.propiedades.bloqueo.descripcion}
            motivo={HELP.propiedades.bloqueo.motivo}
            accion={HELP.propiedades.bloqueo.accion}
            accionLabel="Agregar propiedad"
            onAccion={irAAdministrar}
          />
        ) : (
          <InfoButton
            variant="info"
            size={16}
            titulo={HELP.propiedades.info.titulo}
            descripcion={HELP.propiedades.info.descripcion}
            bullets={HELP.propiedades.info.bullets}
            ejemplo={HELP.propiedades.info.ejemplo}
          />
        )}
        {open && !sinUbicaciones && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#fff',
              borderRadius: theme.radius.md,
              boxShadow: theme.shadows.md,
              border: `1px solid ${theme.colors.border}`,
              minWidth: '200px',
              zIndex: 200,
              overflow: 'hidden',
              animation: 'slideDown 150ms ease',
            }}
          >
            {ubicaciones.map(u => (
              <button
                key={u.id}
                onClick={() => seleccionarUbicacion(u.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: u.id === ubicacionActiva?.id ? theme.colors.primaryLight : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: theme.fonts.sizes.sm,
                  color: theme.colors.text,
                  fontFamily: theme.fonts.family,
                  borderBottom: `1px solid ${theme.colors.borderLight}`,
                }}
              >
                {esGuardia ? `Guardia de seguridad: ${u.alias || u.direccion}` : esAdmin ? `Administrador, ${u.alias || u.direccion}` : (u.alias || u.direccion)}
              </button>
            ))}
            <button
              onClick={irAAdministrar}
              style={{
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: theme.fonts.sizes.sm,
                color: theme.colors.primary,
                fontWeight: theme.fonts.weights.medium,
                fontFamily: theme.fonts.family,
              }}
            >
              {ADMINISTRAR_LABEL}
            </button>
          </div>
        )}
      </div>

      {/* Notification bell */}
      <button
        onClick={() => navigate('/notificaciones')}
        aria-label="Notificaciones"
        style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hayNoLeidas && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: theme.colors.danger,
            border: '2px solid #fff',
          }} />
        )}
      </button>
    </div>
  );
}
