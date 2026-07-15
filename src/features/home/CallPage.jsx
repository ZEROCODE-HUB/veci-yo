import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import theme from '../../config/theme';
import { guardiasSeguridad } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

const TORRES_OPCIONES = ['Torre 1', 'Torre 2', 'Torre 3', 'Seguridad', 'Administrador'];
const personas = ['Mario', 'Ana', 'Carlos', 'Jorge'];
const adminList = ['Soller', 'Carola', 'Marcela'];

export default function CallPage() {
  const navigate = useNavigate();
  const { historialLlamadas, registrarLlamada } = useApp();
  const [torre, setTorre] = useState('Torre 1');
  const [depto, setDepto] = useState('Departamento 105');
  const [persona, setPersona] = useState('Mario');
  const isStaff = torre === 'Seguridad' || torre === 'Administrador';

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

  return (
    <AppShell>
      <PageHeader title="Llamar" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SelectField label="Torre" value={torre} options={TORRES_OPCIONES} onChange={handleTorreChange} />
        {!isStaff && (
          <SelectField label="Departamento" value={depto} options={[...Array(20)].map((_, i) => `Departamento ${100 + i + 1}`)} onChange={setDepto} />
        )}
        <SelectField label="Persona" value={persona} options={isStaff ? staffOptions : personas} onChange={setPersona} />

        {/* Call card */}
        <div
          style={{
            background: theme.colors.bgCard,
            borderRadius: theme.radius.xl,
            padding: '32px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
            boxShadow: theme.shadows.card,
            marginTop: '8px',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: '#5B9BD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px',
            }}
          >
            🏛️
          </div>

          {/* Call buttons */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', paddingInline: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  registrarLlamada({ depto, persona, tipo: 'saliente' });
                  navigate('/llamar/en-curso', { state: { depto, persona } });
                }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: theme.colors.success,
                  color: '#fff',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
                }}
              >
                📞
              </button>
              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center' }}>
                Llamar<br/>Aceptar
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  registrarLlamada({ depto, persona, tipo: 'perdida' });
                  navigate(-1);
                }}
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
                  boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                }}
              >
                📵
              </button>
              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center' }}>
                Rechazar<br/>Cortar
              </span>
            </div>
          </div>
        </div>

        {/* Historial de llamadas */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '10px' }}>
            Historial de llamadas
          </div>
          {(() => {
            const historialPersona = historialLlamadas.filter(h =>
              h.persona === persona && (!isStaff ? h.depto === depto : true)
            );
            if (historialPersona.length === 0) {
              return (
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, textAlign: 'center', padding: '8px 0' }}>
                  Sin llamadas registradas
                </div>
              );
            }
            return historialPersona.slice(0, 10).map(h => (
              <div key={h.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: `1px solid ${theme.colors.borderLight}`,
                fontSize: theme.fonts.sizes.xs,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{h.tipo === 'perdida' ? '📵' : '📞'}</span>
                  <span style={{ color: theme.colors.text }}>{h.fecha} {h.hora}</span>
                </div>
                <span style={{
                  color: h.tipo === 'perdida' ? theme.colors.danger : theme.colors.success,
                  fontWeight: theme.fonts.weights.medium,
                }}>
                  {h.tipo === 'perdida' ? 'Perdida' : 'Saliente'}
                </span>
              </div>
            ));
          })()}
        </div>
      </div>
    </AppShell>
  );
}
