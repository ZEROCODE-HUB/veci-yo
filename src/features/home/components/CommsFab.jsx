import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import theme from '../../../config/theme';
import avatarMessaging from '../../../assets/avatars/messaging.png';
import avatarChat from '../../../assets/avatars/chat.png';
import avatarCall from '../../../assets/avatars/call.png';

export default function CommsFab() {
  const navigate = useNavigate();
  const { rolActivo } = useApp();
  const [fabOpen, setFabOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const esGuardia = rolActivo === 'guardia';

  if (esGuardia) {
    return (
      <>
        <button
          onClick={() => setShowPicker(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(16px + env(safe-area-inset-right, 0px))',
            width: '56px', height: '56px', borderRadius: '50%',
            background: theme.colors.secondary, color: '#fff', fontSize: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', boxShadow: theme.shadows.md,
            zIndex: 500, overflow: 'hidden',
          }}
        >
          <img src={avatarMessaging} alt="Comunicación" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </button>

        <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="Comunicación">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
            <Button variant="primary" fullWidth onClick={() => { setShowPicker(false); navigate('/chat'); }}>
              💬 Chat
            </Button>
            <Button variant="secondary" fullWidth onClick={() => { setShowPicker(false); navigate('/llamar'); }}>
              📞 Llamar
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      {fabOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
          }}
          onClick={() => setFabOpen(false)}
        />
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          right: 'calc(16px + env(safe-area-inset-right, 0px))',
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
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
                  flexShrink: 0,
                }}
              >
                <img src={avatarCall} alt="Llamar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  overflow: 'hidden',
                  boxShadow: theme.shadows.fab,
                  flexShrink: 0,
                }}
              >
                <img src={avatarChat} alt="Chat" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
          {fabOpen ? '\u2715' : <img src={avatarMessaging} alt="Mensaje" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </button>
      </div>
    </>
  );
}
