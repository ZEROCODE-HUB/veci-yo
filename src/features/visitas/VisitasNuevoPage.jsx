import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Calendar from '../../components/ui/Calendar';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import QRDisplay from '../../components/ui/QRDisplay';
import Badge from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { torres, departamentos } from '../../data/mockData';
import tipoVisitaIcons, { visitavalida, visitanovalida } from '../../assets/icons/visitas';

const TIPOS = [
  { id: 'amigos',    label: 'Amigos Familiares',     hasEvento: true },
  { id: 'temporal',  label: 'Profesional Temporal',  hasEvento: false },
  { id: 'permanente',label: 'Profesional Permanente',hasEvento: true },
];

const PACKS = [
  { id: 1, label: 'Pack de 10 verificaciones', precio: '$10' },
  { id: 2, label: 'Pack de 15 verificaciones', precio: '$15' },
  { id: 3, label: 'Pack de 20 verificaciones', precio: '$20' },
];

const inputStyle = {
  width: '100%',
  background: theme.colors.bgMuted,
  borderRadius: theme.radius.lg,
  border: `1px solid ${theme.colors.border}`,
  outline: 'none',
  fontSize: theme.fonts.sizes.sm,
  fontFamily: theme.fonts.family,
  color: theme.colors.text,
  padding: '10px 14px',
  boxSizing: 'border-box',
};

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

  const [showVerifModal, setShowVerifModal] = useState(false);
  const [packSeleccionado, setPackSeleccionado] = useState(null);
  const [verifStep, setVerifStep] = useState(1);
  const [verifResult, setVerifResult] = useState(null);

  const [showQR, setShowQR] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
                <img
                  src={tipoVisitaIcons[tipo.id]}
                  alt={tipo.label}
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                />
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

        {tipoSeleccionado && (
          <>
            {/* Guest count */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold, textAlign: 'center', fontSize: theme.fonts.sizes.base }}>
                Cantidad de invitados
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <SelectField label="Torre:" value={torre} options={torres} onChange={setTorre} />
                </div>
                <div style={{ flex: 1 }}>
                  <SelectField label="Depto:" value={depto} options={departamentos} onChange={setDepto} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <input
                    type="number"
                    value={personas}
                    onChange={e => setPersonas(e.target.value)}
                    min="1"
                    style={{ ...inputStyle, width: '80px' }}
                  />
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>personas</span>
                </div>
                {selectedTipo?.hasEvento && (
                  <Toggle value={esEvento} onChange={setEsEvento} labelRight="Evento" />
                )}
              </div>
            </div>

            {/* Calendar */}
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />

            {/* Person info — todos los campos editables */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold }}>Nombre y Apellido</div>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                style={inputStyle}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Tipo</div>
                  <select value={tipoId} onChange={e => setTipoId(e.target.value)} style={{ ...inputStyle }}>
                    <option>Cedula</option>
                    <option>Pasaporte</option>
                    <option>DNI</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Identificación</div>
                  <input
                    type="text"
                    value={identificacion}
                    onChange={e => setIdentificacion(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Correo electronico</div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Teléfono</div>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  style={inputStyle}
                />
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

      {/* Verificación policial — step 1 */}
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

      {/* Verificación policial — step 2 */}
      <Modal isOpen={showVerifModal && verifStep === 2} onClose={() => setShowVerifModal(false)} title="Verificación policial">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm }}>{packSeleccionado?.label} de antecedentes</p>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes['4xl'], fontWeight: theme.fonts.weights.bold }}>{packSeleccionado?.precio}</p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Seleccione el medio de pago:</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.colors.bgMuted, borderRadius: theme.radius.xl, padding: '14px 16px', border: `1.5px solid ${theme.colors.border}` }}>
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

      {/* Verificación policial — step 3: resultado con íconos locales */}
      <Modal isOpen={showVerifModal && verifStep === 3} onClose={() => setShowVerifModal(false)} title="Verificación Policial">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
          {verifResult === 'success' ? (
            <>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
                La persona es apta<br/>para la visita. (sin antecedentes)
              </p>
              <div style={{ background: '#dcfce7', borderRadius: theme.radius.xl, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={visitavalida} alt="Visita válida" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
              </div>
            </>
          ) : (
            <>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
                La persona NO es apta para la visita<br/>(Con antecedentes) se notifico a las<br/>autoridades pertinentes
              </p>
              <div style={{ background: '#fee2e2', borderRadius: theme.radius.xl, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={visitanovalida} alt="Visita no válida" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
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
          <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={tipoVisitaIcons[tipoSeleccionado]} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
              <span style={{ fontWeight: theme.fonts.weights.bold }}>{nombre}</span>
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI:{identificacion}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge status="Aceptado" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                <span>🕐</span>
                <span>{selectedDate.toLocaleDateString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
