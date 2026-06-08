import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import Calendar from '../../components/ui/Calendar';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import { zonasComunes, horasReserva, cantidadPersonas } from '../../data/mockData';
import theme from '../../config/theme';
import zonaIcons from '../../assets/icons/zonas';

const numeros = ['BBQ N°1', 'BBQ N°2', 'BBQ N°3', 'BBQ N°4'];

export default function ZonaReservarPage() {
  const { zonaId } = useParams();
  const navigate = useNavigate();
  const { agregarReserva } = useApp();

  const zona = zonasComunes.find(z => z.id === zonaId) || { nombre: zonaId, emoji: '🔥' };

  const [hora, setHora] = useState('');
  const [numero, setNumero] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [personas, setPersonas] = useState('');
  const [depto, setDepto] = useState('506 C');
  const [cargoCuota, setCargoCuota] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reservaGenerada, setReservaGenerada] = useState(null);

  const handleAceptar = () => {
    if (!hora) return;
    const reserva = {
      zonaId,
      depto: `Departamento ${depto}`,
      reservaNum: String(Math.floor(Math.random() * 900000 + 100000)),
      horario: hora,
      estado: 'Reservado',
    };
    agregarReserva(reserva);
    setReservaGenerada(reserva);
    setShowSuccess(true);
  };

  return (
    <AppShell>
      <PageHeader title={`Reserva ${zona.nombre}`} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Zone photo */}
        <div
          style={{
            width: '100%',
            height: '120px',
            borderRadius: theme.radius.xl,
            background: 'linear-gradient(135deg, #D4C5A9 0%, #B8A98C 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            overflow: 'hidden',
          }}
        >
          {zonaIcons[zona.id] ? (
            <img
              src={zonaIcons[zona.id]}
              alt={zona.nombre}
              style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            zona.emoji
          )}
        </div>

        <SelectField label="Seleccione hora de reserva:" value={hora} options={horasReserva} onChange={setHora} />
        <SelectField label={`Seleccione N° de ${zona.nombre}:`} value={numero} options={numeros} onChange={setNumero} />
        <Calendar selected={selectedDate} onSelect={setSelectedDate} />
        <SelectField label="Seleccione cantidad de personas:" value={personas} options={cantidadPersonas} onChange={setPersonas} />

        {/* Cost chips */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            background: theme.colors.bgMuted,
            borderRadius: theme.radius.full,
            padding: '8px 14px',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.textSecondary,
            border: `1px solid ${theme.colors.border}`,
          }}>
            Costo: $5 USD por persona
          </span>
          <span style={{
            background: theme.colors.bgMuted,
            borderRadius: theme.radius.full,
            padding: '8px 14px',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.textSecondary,
            border: `1px solid ${theme.colors.border}`,
          }}>
            Garantía:$100 USD
          </span>
        </div>

        {/* Department */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: theme.colors.bgCard,
          borderRadius: theme.radius['2xl'],
          padding: '13px 16px',
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.card,
        }}>
          <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            Escriba el departamento: {depto}
          </span>
          <span style={{ color: theme.colors.textMuted }}>✏️</span>
        </div>

        {/* Toggles */}
        <Toggle
          value={cargoCuota}
          onChange={setCargoCuota}
          labelRight="El costo se carga automáticamente a su cuota de mantenimiento"
        />
        <Toggle
          value={aceptaTerminos}
          onChange={setAceptaTerminos}
          labelRight="Acepta términos y condiciones"
        />

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
            <div style={{
              border: `1.5px solid ${theme.colors.primary}`,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{zona.emoji}</span>
                  <span style={{ fontWeight: theme.fonts.weights.bold }}>{reservaGenerada.depto}</span>
                </div>
                <span style={{ color: theme.colors.success }}>✔✔</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🪪</span>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                  Reserva N°:{reservaGenerada.reservaNum}.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🕐</span>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                  {reservaGenerada.horario}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
