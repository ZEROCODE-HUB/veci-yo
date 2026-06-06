import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import theme from '../../config/theme';
import { torres, departamentos } from '../../data/mockData';

const personas = ['Mario', 'Ana', 'Carlos', 'Jorge'];

export default function CallPage() {
  const navigate = useNavigate();
  const [torre, setTorre] = useState('Torre 1');
  const [depto, setDepto] = useState('Departamento 105');
  const [persona, setPersona] = useState('Mario');

  return (
    <AppShell>
      <PageHeader title="Llamar" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SelectField label="Torre" value={torre} options={torres} onChange={setTorre} />
        <SelectField label="Departamento" value={depto} options={departamentos.map(d => `Departamento ${d}`)} onChange={setDepto} />
        <SelectField label="Persona" value={persona} options={personas} onChange={setPersona} />

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
                onClick={() => navigate('/llamar/en-curso', { state: { depto, persona } })}
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
                onClick={() => navigate(-1)}
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
      </div>
    </AppShell>
  );
}
