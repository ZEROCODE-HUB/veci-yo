import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import Button from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { guardiasSeguridad } from '../../data/mockData';
import theme from '../../config/theme';

const TORRES_OPCIONES = ['Torre 1', 'Torre 2', 'Torre 3', 'Seguridad', 'Administrador'];
const personas = ['Mario', 'Ana', 'Carlos'];
const adminList = ['Soller', 'Carola', 'Marcela'];
const allPersonas = [...personas, ...adminList, ...guardiasSeguridad.map(g => g.nombre)];

const AVATAR_MAP = {
  Mario: '🏢',
  Ana: '🏢',
  Carlos: '🏢',
  Soller: '🛡️',
  Carola: '🛡️',
  Marcela: '🛡️',
  'Roberto Hornado': '👮',
  'Juan Franco': '👮',
};

const DEFAULT_AVATAR = '💬';

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { mensajes, enviarMensaje, marcarMensajesLeidos } = useApp();
  const [vista, setVista] = useState('lista');
  const [selectedConv, setSelectedConv] = useState(null);
  const [torre, setTorre] = useState('Torre 1');
  const [depto, setDepto] = useState('Departamento 105');
  const [persona, setPersona] = useState('Mario');
  const [texto, setTexto] = useState('');
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const bottomRef = useRef(null);
  const isStaff = torre === 'Seguridad' || torre === 'Administrador';

  // Derive conversations from messages
  const conversations = useMemo(() => {
    const map = {};
    mensajes.forEach(msg => {
      const p = msg.persona || 'Desconocido';
      if (!map[p]) {
        map[p] = { persona: p, ultimoMensaje: '', ultimaHora: '', ultimaFecha: '', avatarEmoji: AVATAR_MAP[p] || DEFAULT_AVATAR, noLeidos: 0 };
      }
      map[p].ultimoMensaje = msg.texto;
      map[p].ultimaHora = msg.hora;
      map[p].ultimaFecha = msg.fecha;
      map[p].avatarEmoji = AVATAR_MAP[p] || msg.avatarEmoji || DEFAULT_AVATAR;
      if (!msg.leido) map[p].noLeidos++;
    });
    return Object.values(map);
  }, [mensajes]);

  const convFiltradas = soloNoLeidos
    ? conversations.filter(c => c.noLeidos > 0)
    : conversations;

  const totalNoLeidos = conversations.reduce((s, c) => s + c.noLeidos, 0);

  // Messages visible in chat view
  const mensajesVisibles = selectedConv
    ? mensajes.filter(m => m.persona === selectedConv.persona)
    : [];

  // Apply soloNoLeidos only in list view; in chat view show all for that conversation
  const mensajesChatView = selectedConv
    ? mensajes.filter(m => m.persona === selectedConv.persona)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajesChatView]);

  const handleTorreChange = (val) => {
    setTorre(val);
    if (val === 'Seguridad' && guardiasSeguridad.length > 0) {
      setPersona(guardiasSeguridad[0].nombre);
    } else if (val === 'Administrador') {
      setPersona(adminList[0]);
    } else {
      setPersona(personas[0]);
    }
  };

  const staffOptions = torre === 'Seguridad'
    ? guardiasSeguridad.map(g => g.nombre)
    : adminList;

  const handleSend = () => {
    if (!texto.trim()) return;
    enviarMensaje(texto.trim(), selectedConv?.persona || persona);
    setTexto('');
  };

  const handleMarkRead = () => {
    marcarMensajesLeidos();
    setSoloNoLeidos(false);
  };

  const handleSelectConversation = (conv) => {
    setSelectedConv(conv);
    setTexto(`De nada ${conv.persona}, lo esperamos en recepción saludos.`);
    setVista('chat');
    // Auto-marcar como leídos cuando se abre conversación
    setTimeout(() => marcarMensajesLeidos(), 300);
  };

  const handleNewChat = () => {
    setTorre('Torre 1');
    setDepto('Departamento 105');
    setPersona('Mario');
    setVista('nuevo');
  };

  const handleStartChat = () => {
    const conv = {
      persona,
      avatarEmoji: AVATAR_MAP[persona] || DEFAULT_AVATAR,
    };
    setSelectedConv(conv);
    setTexto('');
    setVista('chat');
  };

  const handleBackToList = () => {
    setSelectedConv(null);
    setVista('lista');
  };

  return (
    <AppShell>
      {vista === 'lista' && (
        <>
          <PageHeader title="Chat" onBack={() => navigate(-1)} />
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* No leídos bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px', flexShrink: 0,
              background: soloNoLeidos ? theme.colors.primaryLight : theme.colors.bgCard,
              borderBottom: `1px solid ${theme.colors.border}`,
            }}>
              <button
                onClick={() => setSoloNoLeidos(!soloNoLeidos)}
                style={{
                  background: soloNoLeidos ? theme.colors.primary : 'none',
                  border: `1.5px solid ${soloNoLeidos ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: theme.radius.full,
                  padding: '4px 14px', cursor: 'pointer',
                  fontSize: theme.fonts.sizes.xs,
                  fontFamily: theme.fonts.family,
                  fontWeight: theme.fonts.weights.semibold,
                  color: soloNoLeidos ? '#fff' : theme.colors.textSecondary,
                }}
              >
                {soloNoLeidos ? `● No leídos (${totalNoLeidos})` : '○ No leídos'}
              </button>
              {totalNoLeidos > 0 && (
                <button
                  onClick={handleMarkRead}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: theme.fonts.sizes.xs, color: theme.colors.primary,
                    fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.medium,
                  }}
                >
                  Marcar todos leídos
                </button>
              )}
            </div>

            {/* Conversation list */}
            <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
              {convFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: theme.colors.textMuted, fontSize: theme.fonts.sizes.sm }}>
                  {soloNoLeidos ? 'No hay conversaciones sin leer' : 'No hay conversaciones'}
                </div>
              )}
              {convFiltradas.map(conv => (
                <button
                  key={conv.persona}
                  onClick={() => handleSelectConversation(conv)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '12px 0',
                    border: 'none', borderBottom: `1px solid ${theme.colors.borderLight}`,
                    background: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: theme.fonts.family,
                  }}
                >
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: '#5B9BD5', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                  }}>
                    {conv.avatarEmoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                        {conv.persona}
                      </span>
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
                        {conv.ultimaFecha} {conv.ultimaHora}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {truncate(conv.ultimoMensaje, 50)}
                      </span>
                      {conv.noLeidos > 0 && (
                        <span style={{
                          background: theme.colors.primary, color: '#fff',
                          borderRadius: '50%', minWidth: '20px', height: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: theme.fonts.weights.bold, flexShrink: 0,
                          marginLeft: '8px',
                        }}>
                          {conv.noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Nuevo chat button */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.colors.border}` }}>
              <Button variant="primary" fullWidth onClick={handleNewChat}>
                + Nuevo chat
              </Button>
            </div>
          </div>
        </>
      )}

      {vista === 'chat' && selectedConv && (
        <>
          <PageHeader title={selectedConv.persona} onBack={handleBackToList} />
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages */}
            <div className="scrollable" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {mensajesChatView.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: theme.colors.textMuted, fontSize: theme.fonts.sizes.sm }}>
                  No hay mensajes con {selectedConv.persona}
                </div>
              )}
              {mensajesChatView.map(msg => (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: msg.de === 'portero' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start', gap: '8px',
                  padding: '6px 0',
                  borderBottom: `1px solid ${theme.colors.borderLight}`,
                  ...(!msg.leido ? { background: 'rgba(37, 99, 235, 0.05)', borderRadius: '8px', padding: '6px 8px' } : {}),
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: msg.de === 'portero' ? '#9BA3AE' : '#5B9BD5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0,
                  }}>
                    {msg.avatarEmoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights?.normal || 1.5 }}>
                      {msg.texto}
                    </p>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '4px', textAlign: msg.de === 'portero' ? 'right' : 'left' }}>
                      {msg.hora}<br/>{msg.fecha}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px', background: theme.colors.bgCard,
              borderTop: `1px solid ${theme.colors.border}`,
              display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
            }}>
              <input
                type="text" value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe un mensaje..."
                style={{
                  flex: 1, fontSize: theme.fonts.sizes.base, color: theme.colors.text,
                  background: 'none', border: 'none', outline: 'none', fontFamily: theme.fonts.family,
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: theme.colors.primary, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                ▶
              </button>
            </div>
          </div>
        </>
      )}

      {vista === 'nuevo' && (
        <>
          <PageHeader title="Nuevo chat" onBack={() => setVista('lista')} />
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SelectField label="Torre" value={torre} options={TORRES_OPCIONES} onChange={handleTorreChange} />
            {!isStaff && (
              <SelectField label="Departamento" value={depto} options={[...Array(20)].map((_, i) => `Departamento ${100 + i + 1}`)} onChange={setDepto} />
            )}
            <SelectField label="Persona" value={persona} options={isStaff ? staffOptions : personas} onChange={setPersona} />
            <Button variant="primary" fullWidth onClick={handleStartChat}>Iniciar chat</Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
