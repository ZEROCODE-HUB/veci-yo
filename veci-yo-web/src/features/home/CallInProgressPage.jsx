import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import theme from '../../config/theme';

export default function CallInProgressPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { depto = 'Departamento 106 C', persona = 'Mario casa' } = location.state || {};
  const [seconds, setSeconds] = useState(15);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <AppShell>
      <PageHeader title="Llamar" onBack={() => navigate('/')} />
      <div style={{ padding: '16px' }}>
        <div
          style={{
            background: '#9BA3AE',
            borderRadius: theme.radius.xl,
            padding: '24px 16px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            minHeight: '520px',
            position: 'relative',
          }}
        >
          {/* Caller info */}
          <div
            style={{
              background: '#fff',
              borderRadius: theme.radius.xl,
              padding: '14px 24px',
              textAlign: 'center',
              boxShadow: theme.shadows.card,
            }}
          >
            <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.lg, color: theme.colors.text }}>
              {depto}
            </div>
            <div style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
              {persona}
            </div>
            <div style={{ width: '40px', height: '2px', background: theme.colors.border, margin: '8px auto 0' }} />
          </div>

          {/* Timer */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: theme.fonts.sizes['4xl'], fontWeight: theme.fonts.weights.normal, lineHeight: 1.2 }}>
                Llamada<br/>en curso
              </div>
              <div style={{ fontSize: '48px', fontWeight: theme.fonts.weights.normal, marginTop: '8px' }}>
                {fmt(seconds)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
            {/* Speaker */}
            <button
              onClick={() => setMuted(!muted)}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.5)',
                color: '#fff',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {muted ? '🔇' : '🔊'}
            </button>

            {/* Hang up */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: theme.colors.danger,
                  color: '#fff',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.5)',
                }}
              >
                📵
              </button>
              <span style={{ fontSize: theme.fonts.sizes.xs, color: 'rgba(255,255,255,0.8)' }}>Cortar</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
