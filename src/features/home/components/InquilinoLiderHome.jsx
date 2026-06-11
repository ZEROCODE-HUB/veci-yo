import { useNavigate } from 'react-router-dom';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import { inquilinoLiderReputacion, agendaHoyInquilinoLider } from '../../../data/mockData';

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
export default function InquilinoLiderHome() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const { nombre, nivel, logros } = inquilinoLiderReputacion;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Reputación */}
      <div style={{ ...cardStyle, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => navigate('/ranking')}
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
          fontSize: '40px',
          boxShadow: theme.shadows.fab,
        }}>
          🏆
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
                fontSize: '24px',
                opacity: logro.conseguido ? 1 : 0.45,
                filter: logro.conseguido ? 'none' : 'grayscale(1)',
              }}>
                {logro.emoji}
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
        onClick={() => addToast('Funcionalidad en desarrollo')}
        style={{
          ...cardStyle,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          border: 'none',
          cursor: 'pointer',
          fontFamily: theme.fonts.family,
        }}
      >
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: theme.colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
        }}>
          🙏
        </div>
        <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.medium, color: theme.colors.text }}>
          Gratitud
        </span>
      </button>

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
            fontSize: '16px',
            flexShrink: 0,
          }}>
            🎁
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
