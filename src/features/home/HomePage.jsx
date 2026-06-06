import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import theme from '../../config/theme';

const modules = [
  { label: 'Correspondencia', emoji: '📬', bg: '#FEF3C7', path: '/correspondencia' },
  { label: 'Visitas',         emoji: '🗝️',  bg: '#FEF3C7', path: '/visitas' },
  { label: 'Zonas Comunes',   emoji: '🏋️', bg: '#FEF3C7', path: '/zonas-comunes' },
  { label: 'Anuncios',        emoji: '📣',  bg: '#FEF3C7', path: '/anuncios' },
  { label: 'Ranking',         emoji: '🏆',  bg: '#FEF3C7', path: '/ranking' },
  { label: 'Reglas',          emoji: null,  bg: '#FEF3C7', path: '/reglas', isReglas: true },
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
              {mod.isReglas ? (
                <ReglasThumbnail />
              ) : (
                <span style={{ fontSize: '52px', lineHeight: 1 }}>{mod.emoji}</span>
              )}
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
                {mod.label}
              </span>
            </button>
          ))}
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
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
                }}
              >
                📞
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
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: theme.shadows.fab,
                }}
              >
                💬
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
          }}
        >
          {fabOpen ? '✕' : '📞'}
        </button>
      </div>
    </AppShell>
  );
}
