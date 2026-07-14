import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import Calendar from '../../components/ui/Calendar';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { zonasComunes, horasReserva, cantidadPersonas } from '../../data/mockData';
import theme from '../../config/theme';
import zonaIcons, { zonaBanners } from '../../assets/icons/zonas';

const CAMPOS_POR_ZONA = {
  piscina:     { numero: false, personas: true },
  parque:      { numero: false, personas: true },
  bbq:         { numero: true,  personas: true },
  gym:         { numero: false, personas: false },
  coworking:   { numero: true,  personas: true },
  tenis:       { numero: true,  personas: true },
  'sala-juegos': { numero: false, personas: true },
  lavanderia:  { numero: true,  personas: false },
};

export default function ZonaReservarPage() {
  const { zonaId } = useParams();
  const navigate = useNavigate();
  const { agregarReserva, zonasComunesConfig } = useApp();

  const zona = zonasComunes.find(z => z.id === zonaId) || { nombre: zonaId, emoji: '🔥' };
  const zonaConfig = zonasComunesConfig[zonaId] || {};
  const campos = CAMPOS_POR_ZONA[zonaId] || { numero: true, personas: true };
  const numeros = Array.from({ length: zona.total || 4 }, (_, i) => `${zona.nombre} N°${i + 1}`);
  const requiereAprobacion = zonaConfig.requiereAprobacion || false;

  const [hora, setHora] = useState('');
  const [numero, setNumero] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [personas, setPersonas] = useState('');
  const [nombresPersonas, setNombresPersonas] = useState([]);
  const [comentarios, setComentarios] = useState('');
  const [depto, setDepto] = useState('506 C');
  const [cargoCuota, setCargoCuota] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reservaGenerada, setReservaGenerada] = useState(null);

  const handlePersonasChange = (val) => {
    setPersonas(val);
    const count = parseInt(val.split(' ')[0]) || 0;
    setNombresPersonas(prev => {
      const newArr = [...prev];
      while (newArr.length < count) newArr.push('');
      while (newArr.length > count) newArr.pop();
      return newArr;
    });
  };

  const handleAceptar = () => {
    if (!hora) return;
    const estado = requiereAprobacion ? 'Pendiente' : 'Aprobado';
    const personasList = nombresPersonas.filter(Boolean).map(n => ({ nombre: n, llego: false }));
    const reserva = {
      zonaId,
      depto: `Departamento ${depto}`,
      nombre: nombresPersonas[0] || depto,
      acompanantes: Math.max(0, nombresPersonas.filter(Boolean).length - 1),
      reservaNum: String(Math.floor(Math.random() * 900000 + 100000)),
      horario: hora,
      estado,
      personas: personasList,
      comentarios,
    };
    agregarReserva(reserva);
    setReservaGenerada(reserva);
    setShowSuccess(true);
  };

  return (
    <AppShell>
      <PageHeader title={`Reserva ${zona.nombre}`} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Zone banner */}
        <div
          style={{
            width: '100%',
            height: '180px',
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #D4C5A9 0%, #B8A98C 100%)',
          }}
        >
          {zonaBanners[zona.id] ? (
            <img
              src={zonaBanners[zona.id]}
              alt={zona.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : zonaIcons[zona.id] ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={zonaIcons[zona.id]} alt={zona.nombre} style={{ width: '80px', height: '80px', objectFit: 'contain', opacity: 0.7 }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '48px' }}>{zona.emoji}</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
            <span style={{ color: '#fff', fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.lg, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{zona.nombre}</span>
          </div>
        </div>

        <SelectField label="Seleccione hora de reserva:" value={hora} options={horasReserva} onChange={setHora} />
        {campos.numero && (
          <SelectField label={`Seleccione N° de ${zona.nombre}:`} value={numero} options={numeros} onChange={setNumero} />
        )}
        <Calendar selected={selectedDate} onSelect={setSelectedDate} />
        <SelectField label="Cantidad de personas que asistirán junto al titular:" value={personas} options={cantidadPersonas} onChange={handlePersonasChange} />

        {nombresPersonas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '2px' }}>Nombres de los asistentes</div>
            {nombresPersonas.map((nom, idx) => (
              <input
                key={idx}
                type="text"
                value={nom}
                onChange={e => {
                  const newNoms = [...nombresPersonas];
                  newNoms[idx] = e.target.value;
                  setNombresPersonas(newNoms);
                }}
                placeholder={`Nombre del asistente ${idx + 1}${idx === 0 ? ' (Titular)' : ''}`}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: theme.radius['2xl'],
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.bgCard,
                  boxShadow: theme.shadows.card,
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
        )}

        <div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Comentarios u observaciones</div>
          <textarea
            value={comentarios}
            onChange={e => setComentarios(e.target.value)}
            placeholder="Escriba sus comentarios aquí..."
            rows={3}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: theme.radius['2xl'],
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.bgCard,
              boxShadow: theme.shadows.card,
              fontSize: theme.fonts.sizes.base,
              fontFamily: theme.fonts.family,
              color: theme.colors.text,
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Cost chips */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '8px 14px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>
            Costo: $5 USD por persona
          </span>
          <span style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '8px 14px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>
            Garantía:$100 USD
          </span>
        </div>

        {/* Department — editable */}
        <div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Departamento</div>
          <input
            type="text"
            value={depto}
            onChange={e => setDepto(e.target.value)}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: theme.radius['2xl'],
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.bgCard,
              boxShadow: theme.shadows.card,
              fontSize: theme.fonts.sizes.base,
              fontFamily: theme.fonts.family,
              color: theme.colors.text,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <Toggle value={cargoCuota} onChange={setCargoCuota} labelRight="El costo se carga automáticamente a su cuota de mantenimiento" />
        <Toggle value={aceptaTerminos} onChange={setAceptaTerminos} labelRight="Acepta términos y condiciones" />

        {requiereAprobacion && (
          <div style={{ background: theme.colors.warningLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.warning, lineHeight: 1.5, textAlign: 'center' }}>
            Esta area requiere aprobacion manual. La reserva quedara en estado Pendiente hasta que un administrador la revise.
          </div>
        )}

        <Button variant="primary" fullWidth onClick={handleAceptar}>Aceptar</Button>
        <div style={{ height: '16px' }} />
      </div>

      {/* Success modal */}
      <Modal
        isOpen={showSuccess}
        onClose={() => { setShowSuccess(false); navigate(`/zonas-comunes/${zonaId}`); }}
        title={`Reserva ${zona.nombre} N°1`}
      >
        {reservaGenerada && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.semibold }}>
              Se reservo con éxito la zona comun
            </p>
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{zona.emoji}</span>
                  <span style={{ fontWeight: theme.fonts.weights.bold }}>{reservaGenerada.depto}</span>
                </div>
                <span style={{ color: theme.colors.success }}>✔✔</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🪪</span>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{reservaGenerada.reservaNum}.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🕐</span>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{reservaGenerada.horario}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
