import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import { inquilinoLiderReputacion, agendaHoyInquilinoLider } from '../../../data/mockData';
import iconReputacion from '../../../assets/icons/inquilino-lider/reputacion.png';
import imagenBeach from '../../../assets/imagenes/beach.png';
import iconRegalos from '../../../assets/icons/inquilino-lider/regalos.png';
import iconReciclador from '../../../assets/icons/inquilino-lider/medalla-reciclador.png';
import iconAtento from '../../../assets/icons/inquilino-lider/medalla-atento.png';
import iconLogro3 from '../../../assets/icons/inquilino-lider/medalla-logro3.png';
import iconLogro4 from '../../../assets/icons/inquilino-lider/medalla-logro4.png';
import iconLogro5 from '../../../assets/icons/inquilino-lider/medalla-logro5.png';

const LOGRO_ICONS = {
  reciclador: { src: iconReciclador, scale: 1 },
  atento: { src: iconAtento, scale: 1 },
  logro3: { src: iconLogro3, scale: 1 },
  logro4: { src: iconLogro4, scale: 1 },
  logro5: { src: iconLogro5, scale: 1 },
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const filaStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '14px 0',
  background: 'none',
  fontFamily: theme.fonts.family,
};

// Pantalla 1 del Inquilino Líder: Reputación, Gratitud y agenda de "Hoy".
// Reemplaza el resumen de Vivienda como Home de este rol; "Vivienda" pasa a
// vivir en su propia pantalla (/vivienda, tab "Viviendas").
const HORAS_TURNO = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00'];

function GraficoBarras({ visitasPorHora, maxVisitas }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 4px' }}>
      {HORAS_TURNO.map((hora, i) => {
        const cantidad = visitasPorHora[i] || 0;
        const altura = maxVisitas > 0 ? (cantidad / maxVisitas) * 100 : 0;
        const intensidad = Math.min(1, cantidad / (maxVisitas || 1));
        return (
          <div key={hora} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '100%',
              height: `${Math.max(4, altura)}%`,
              borderRadius: '4px 4px 0 0',
              background: `rgba(37, 99, 235, ${0.2 + intensidad * 0.8})`,
              transition: 'height 300ms ease',
              minHeight: '4px',
            }} />
            <span style={{ fontSize: '7px', color: theme.colors.textMuted, writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
              {hora}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function InquilinoLiderHome() {
  const navigate = useNavigate();
  const { addToast, rolActivo, visitas } = useApp();
  const { nombre, nivel, logros } = inquilinoLiderReputacion;
  const esGuardia = rolActivo === 'guardia';

  const [planDia, setPlanDia] = useState('Hoy');

  const visitasDemoData = {
    'Hoy': [2, 5, 8, 14, 10, 18, 20, 12, 7, 3],
    'Mañana': [1, 4, 7, 12, 15, 22, 18, 10, 5, 2],
  };

  const visitasPorHora = visitasDemoData[planDia] || [];

  const maxVisitas = Math.max(1, ...visitasPorHora);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Reputación */}
      <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate('/reputacion')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: theme.fonts.sizes.md,
            fontWeight: theme.fonts.weights.semibold,
            color: theme.colors.text,
            textDecoration: 'underline',
            fontFamily: theme.fonts.family,
          }}
        >
          Reputación
        </button>

        <div style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          background: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: theme.shadows.fab,
          overflow: 'hidden',
        }}>
          <img src={iconReputacion} alt="Reputación" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            {nombre}
          </div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
            {nivel}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
          {logros.map(logro => (
            <div key={logro.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: logro.conseguido ? theme.colors.iconAmberBg : theme.colors.bgMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: logro.conseguido ? 1 : 0.45,
                filter: logro.conseguido ? 'none' : 'grayscale(1)',
                overflow: 'hidden',
              }}>
                <img src={LOGRO_ICONS[logro.key].src} alt={logro.label} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${LOGRO_ICONS[logro.key].scale})` }} />
              </div>
              <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, textAlign: 'center' }}>
                {logro.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gratitud */}
      <button
        type="button"
        onClick={() => navigate('/cuadro-honor')}
        style={{
          ...cardStyle,
          border: 'none',
          cursor: 'pointer',
          fontFamily: theme.fonts.family,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          minHeight: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
        }}
      >
        <img src={imagenBeach} alt="" style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.40)',
          zIndex: 1,
        }} />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 2, marginBottom: '10px' }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span style={{
          fontSize: '28px',
          fontWeight: theme.fonts.weights.bold,
          color: '#FFFFFF',
          position: 'relative',
          zIndex: 2,
          marginBottom: '6px',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          letterSpacing: '1.5px',
        }}>
          Gratitud
        </span>
        <span style={{
          fontSize: theme.fonts.sizes.sm,
          color: 'rgba(255,255,255,0.9)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '260px',
          lineHeight: theme.fonts.lineHeights.snug,
          textShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}>
          Reconoce a tu comunidad con medallas y regalos.
        </span>
      </button>

      {/* Planificación de visitas — solo para Guardia de Seguridad */}
      {esGuardia && (
        <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
              Planificación de visitas
            </h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Hoy', 'Mañana'].map(dia => (
                <button
                  key={dia}
                  type="button"
                  onClick={() => setPlanDia(dia)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: theme.radius.full,
                    background: planDia === dia ? theme.colors.primary : theme.colors.bgMuted,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: theme.fonts.sizes.xs,
                    fontWeight: theme.fonts.weights.semibold,
                    color: planDia === dia ? theme.colors.text : theme.colors.textSecondary,
                    fontFamily: theme.fonts.family,
                  }}
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>
          <GraficoBarras visitasPorHora={visitasPorHora} maxVisitas={maxVisitas} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>
            <span>Menos visitas</span>
            <span>Más visitas</span>
          </div>
        </div>
      )}

      {/* Hoy */}
      <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '4px' }}>
          Hoy
        </h2>

        <button
          type="button"
          onClick={() => addToast('Funcionalidad en desarrollo')}
          style={{
            ...filaStyle,
            borderWidth: '0 0 1px 0',
            borderStyle: 'solid',
            borderColor: theme.colors.borderLight,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Regalos por dar 1</span>
          <span style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: theme.colors.dangerLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            <img src={iconRegalos} alt="Regalos por dar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </span>
        </button>

        {agendaHoyInquilinoLider.map((item, i) => (
          <div
            key={item.id}
            style={{
              ...filaStyle,
              borderWidth: i === agendaHoyInquilinoLider.length - 1 ? 0 : '0 0 1px 0',
              borderStyle: 'solid',
              borderColor: theme.colors.borderLight,
            }}
          >
            <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{item.titulo}</span>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.hora}</span>
          </div>
        ))}
      </div>

      <div style={{ height: '24px' }} />
    </div>
  );
}
