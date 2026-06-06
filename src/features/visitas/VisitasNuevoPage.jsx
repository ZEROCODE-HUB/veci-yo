import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Calendar from '../../components/ui/Calendar';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import QRDisplay from '../../components/ui/QRDisplay';
import Badge from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { torres, departamentos } from '../../data/mockData';

const TIPOS = [
  { id: 'amigos',    label: 'Amigos Familiares',     emoji: '🏠', hasEvento: true },
  { id: 'temporal',  label: 'Profesional Temporal',  emoji: '👷', hasEvento: false },
  { id: 'permanente',label: 'Profesional Permanente',emoji: '👩‍⚕️', hasEvento: true },
];

const PACKS = [
  { id: 1, label: 'Pack de 10 verificaciones', precio: '$10' },
  { id: 2, label: 'Pack de 15 verificaciones', precio: '$15' },
  { id: 3, label: 'Pack de 20 verificaciones', precio: '$20' },
];

export default function VisitasNuevoPage() {
  const navigate = useNavigate();
  const { agregarVisita } = useApp();

  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [esEvento, setEsEvento] = useState(false);
  const [torre, setTorre] = useState('');
  const [depto, setDepto] = useState('');
  const [personas, setPersonas] = useState('5');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nombre, setNombre] = useState('Mariano Lazarto');
  const [tipoId, setTipoId] = useState('Cedula');
  const [identificacion, setIdentificacion] = useState('122652268562');
  const [email, setEmail] = useState('mlazarto@gmail.com');
  const [telefono, setTelefono] = useState('+5965165136546');

  // Verification flow
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [packSeleccionado, setPackSeleccionado] = useState(null);
  const [verifStep, setVerifStep] = useState(1); // 1=pack, 2=pago, 3=resultado
  const [verifResult, setVerifResult] = useState(null); // 'success' | 'error'

  // QR modal
  const [showQR, setShowQR] = useState(false);
  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  // Accept terms
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const selectedTipo = TIPOS.find(t => t.id === tipoSeleccionado);

  const handleVerificacion = () => {
    setVerifStep(1);
    setVerifResult(null);
    setShowVerifModal(true);
  };

  const handleVerifNext = () => {
    if (verifStep === 1) {
      if (!packSeleccionado) return;
      setVerifStep(2);
    } else if (verifStep === 2) {
      setVerifStep(3);
      setVerifResult(Math.random() > 0.4 ? 'success' : 'error');
    }
  };

  const handleAceptar = () => {
    agregarVisita({
      tipo: tipoSeleccionado,
      nombre,
      ci: identificacion,
      estado: 'Pendiente',
      fechaDesde: selectedDate.toLocaleDateString('es-AR'),
      fechaHasta: selectedDate.toLocaleDateString('es-AR'),
      esEvento,
      nombreEvento: esEvento ? `Evento: ${nombre}` : undefined,
      invitados: esEvento ? [{ nombre, llego: false }] : [],
      qrUrl: 'wwww.veciyolink/2342342.com',
      reserva: `N°: ${Math.floor(Math.random() * 900000 + 100000)}`,
      torre,
      depto,
      personas: parseInt(personas),
    });
    setShowQR(true);
  };

  const handleQRAccept = () => {
    setShowQR(false);
    setShowSuccess(true);
  };

  return (
    <AppShell>
      <PageHeader title="Visitas" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {TIPOS.map(tipo => {
            const isActive = tipoSeleccionado === tipo.id;
            return (
              <button
                key={tipo.id}
                onClick={() => setTipoSeleccionado(tipo.id)}
                style={{
                  background: isActive ? theme.colors.primary : theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  border: `2px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  boxShadow: theme.shadows.card,
                  gridColumn: tipo.id === 'permanente' ? '1' : 'auto',
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                }}>
                  {tipo.emoji}
                </div>
                <span style={{
                  fontSize: theme.fonts.sizes.sm,
                  fontWeight: theme.fonts.weights.medium,
                  color: isActive ? theme.colors.text : theme.colors.textSecondary,
                  textAlign: 'center',
                }}>
                  {tipo.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Show form when type selected */}
        {tipoSeleccionado && (
          <>
            {/* Guest count */}
            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold, textAlign: 'center', fontSize: theme.fonts.sizes.base }}>
                Cantidad de invitados
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.sm }}>Torre:</span>
                  <select value={torre} onChange={e => setTorre(e.target.value)} style={{ padding: '6px 10px', borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm }}>
                    <option value="">-</option>
                    {torres.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.sm }}>Depto:</span>
                  <select value={depto} onChange={e => setDepto(e.target.value)} style={{ padding: '6px 10px', borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm }}>
                    <option value="">-</option>
                    {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: theme.colors.bgMuted,
                  borderRadius: theme.radius.lg,
                  padding: '8px 12px',
                }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm }}>{personas} personas</span>
                  <span style={{ fontSize: '14px', color: theme.colors.textMuted }}>✏️</span>
                </div>
                {selectedTipo?.hasEvento && (
                  <Toggle value={esEvento} onChange={setEsEvento} labelRight="Evento" />
                )}
              </div>
            </div>

            {/* Calendar */}
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />

            {/* Person info */}
            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold }}>Nombre y Apellido</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: theme.colors.bgMuted,
                borderRadius: theme.radius.lg,
                padding: '10px 14px',
              }}>
                <span>{nombre}</span>
                <span style={{ color: theme.colors.textMuted }}>✏️</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Tipo</div>
                  <select value={tipoId} onChange={e => setTipoId(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm }}>
                    <option>Cedula</option>
                    <option>Pasaporte</option>
                    <option>DNI</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Identificación</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '8px 10px' }}>
                    <span style={{ flex: 1, fontSize: theme.fonts.sizes.sm }}>{identificacion}</span>
                    <span style={{ color: theme.colors.textMuted, fontSize: '12px' }}>✏️</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Correo electronico</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 14px' }}>
                  <span style={{ flex: 1, fontSize: theme.fonts.sizes.sm }}>{email}</span>
                  <span style={{ color: theme.colors.textMuted }}>✏️</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Teléfono</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 14px' }}>
                  <span style={{ flex: 1, fontSize: theme.fonts.sizes.sm }}>{telefono}</span>
                  <span style={{ color: theme.colors.textMuted }}>✏️</span>
                </div>
              </div>
            </div>

            {/* Verificación policial button */}
            <button
              onClick={handleVerificacion}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: theme.radius.full,
                background: '#374151',
                color: '#fff',
                fontWeight: theme.fonts.weights.semibold,
                fontSize: theme.fonts.sizes.base,
                border: 'none',
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              Verificación Policial
              <span style={{ fontSize: '20px' }}>🔢</span>
            </button>

            <Button variant="primary" fullWidth onClick={handleAceptar}>Aceptar</Button>
          </>
        )}

        <div style={{ height: '16px' }} />
      </div>

      {/* Verificación policial modal - step 1: pack selection */}
      <Modal isOpen={showVerifModal && verifStep === 1} onClose={() => setShowVerifModal(false)} title="Verificación policial">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
            Escoge un pack de verificaciones y utilízalas cuando las necesites no caducan
          </p>
          {PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => setPackSeleccionado(pack)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: theme.radius.xl,
                border: `2px solid ${packSeleccionado?.id === pack.id ? theme.colors.primary : theme.colors.border}`,
                background: packSeleccionado?.id === pack.id ? theme.colors.primaryLight : theme.colors.bgMuted,
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
              }}
            >
              <span style={{ fontWeight: theme.fonts.weights.semibold }}>{pack.label}</span>
              <span style={{ fontWeight: theme.fonts.weights.bold }}>{pack.precio}</span>
            </button>
          ))}
          <Button variant="primary" fullWidth onClick={handleVerifNext}>Siguiente</Button>
        </div>
      </Modal>

      {/* Verificación policial modal - step 2: payment */}
      <Modal isOpen={showVerifModal && verifStep === 2} onClose={() => setShowVerifModal(false)} title="Verificación policial">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm }}>{packSeleccionado?.label} de antecedentes</p>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes['4xl'], fontWeight: theme.fonts.weights.bold }}>{packSeleccionado?.precio}</p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Seleccione el medio de pago:</p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.colors.bgMuted,
            borderRadius: theme.radius.xl,
            padding: '14px 16px',
            border: `1.5px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#1A56DB', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '4px 6px', borderRadius: '4px' }}>VISA</div>
              <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.sm }}>5647XXXXXX4567</span>
            </div>
            <span style={{ fontWeight: theme.fonts.weights.bold }}>$15</span>
          </div>
          <Toggle value={aceptaTerminos} onChange={setAceptaTerminos} labelRight="Acepta términos y condiciones 🔗" />
          <Button variant="primary" fullWidth onClick={handleVerifNext} disabled={!aceptaTerminos}>Siguiente</Button>
        </div>
      </Modal>

      {/* Verificación policial modal - step 3: result */}
      <Modal isOpen={showVerifModal && verifStep === 3} onClose={() => setShowVerifModal(false)} title="Verificación Policial">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
          {verifResult === 'success' ? (
            <>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
                La persona es apta<br/>para la visita. (sin antecedentes)
              </p>
              <div style={{ fontSize: '72px' }}>🏛️</div>
              <div style={{
                background: '#dcfce7',
                borderRadius: theme.radius.xl,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{ fontSize: '48px' }}>🛡️</div>
              </div>
            </>
          ) : (
            <>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
                La persona NO es apta para la visita<br/>(Con antecedentes) se notifico a las<br/>autoridades pertinentes
              </p>
              <div style={{
                background: '#fee2e2',
                borderRadius: theme.radius.xl,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{ fontSize: '48px' }}>🚨</div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* QR modal */}
      <Modal isOpen={showQR} onClose={handleQRAccept} title="Generar QR">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.6 }}>
            Esto les permite identificarse para ingresar al domicilio sin necesidad de presentar su cedula todo el tiempo y ahorrándole el tiempo a usted de estar cargando todos los días que vienen a realizar tareas a su hogar.
          </p>
          <QRDisplay url="wwww.veciyolink/2342342.com" />
          <Button variant="primary" fullWidth onClick={handleQRAccept}>Aceptar</Button>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); navigate('/visitas'); }} title="Visita amigos familiares">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.semibold }}>Visita cargada con exito</p>
          <div style={{
            background: theme.colors.bgMuted,
            borderRadius: theme.radius.xl,
            padding: '14px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🏠</span>
              <span style={{ fontWeight: theme.fonts.weights.bold }}>{nombre}</span>
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI:{identificacion}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge status="Aceptado" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                <span>🕐</span>
                <span>{selectedDate.toLocaleDateString('es-AR')} a {selectedDate.toLocaleDateString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
