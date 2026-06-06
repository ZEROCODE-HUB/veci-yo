import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import { useApp } from '../../context/AppContext';
import { torres, departamentos } from '../../data/mockData';
import theme from '../../config/theme';

const personas = ['Mario', 'Ana', 'Carlos'];

export default function ChatPage() {
  const navigate = useNavigate();
  const { mensajes, enviarMensaje } = useApp();
  const [torre, setTorre] = useState('Torre 1');
  const [depto, setDepto] = useState('Departamento 105');
  const [persona, setPersona] = useState('Mario');
  const [texto, setTexto] = useState('De nada Mario, lo esperamos en recepción saludos.');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleSend = () => {
    if (!texto.trim()) return;
    enviarMensaje(texto.trim());
    setTexto('');
  };

  return (
    <AppShell>
      <PageHeader title="Chat" onBack={() => navigate(-1)} />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Filters */}
        <div
          style={{
            background: theme.colors.bgCard,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderBottom: `1px solid ${theme.colors.border}`,
            flexShrink: 0,
          }}
        >
          <SelectField label="Torre" value={torre} options={torres} onChange={setTorre} />
          <SelectField label="Departamento" value={depto} options={departamentos.map(d => `Departamento ${d}`)} onChange={setDepto} />
          <SelectField label="Persona" value={persona} options={personas} onChange={setPersona} />
        </div>

        {/* Messages */}
        <div
          className="scrollable"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {mensajes.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: msg.de === 'portero' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '6px 0',
                borderBottom: `1px solid ${theme.colors.borderLight}`,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: msg.de === 'portero' ? '#9BA3AE' : '#5B9BD5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}
              >
                {msg.avatarEmoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: theme.fonts.sizes.base,
                  color: theme.colors.text,
                  lineHeight: theme.fonts.lineHeights?.normal || 1.5,
                }}>
                  {msg.texto}
                </p>
                <div style={{
                  fontSize: theme.fonts.sizes.xs,
                  color: theme.colors.textMuted,
                  marginTop: '4px',
                  textAlign: msg.de === 'portero' ? 'right' : 'left',
                }}>
                  {msg.hora}<br/>{msg.fecha}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: '12px 16px',
            background: theme.colors.bgCard,
            borderTop: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            style={{
              flex: 1,
              fontSize: theme.fonts.sizes.base,
              color: theme.colors.text,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontFamily: theme.fonts.family,
            }}
          />
          <button
            onClick={handleSend}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: theme.colors.primary,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ▶
          </button>
        </div>
      </div>
    </AppShell>
  );
}
