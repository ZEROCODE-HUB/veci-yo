import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';
import { ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import {
  reglasEstados,
  reglasDepartamentos,
  reglasTorres,
  reglasDepartamentosFiltro,
  reglasPisos,
} from '../../data/mockData';
import iconDepartamento from '../../assets/icons/inquilino-lider/reconocimiento-hero.png';
import iconResidentePermanente from '../../assets/icons/reglas/residente-permanente.png';
import iconResidenteTemporal from '../../assets/icons/reglas/residente-temporal.png';
import iconRnt from '../../assets/icons/shared/rnt.png';

const TABS = ['Todos', ...reglasEstados];

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const pillButtonStyle = {
  background: theme.colors.bgMuted,
  border: 'none',
  borderRadius: theme.radius.full,
  padding: '14px 18px',
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.medium,
  color: theme.colors.text,
  cursor: 'pointer',
  fontFamily: theme.fonts.family,
  textAlign: 'center',
  width: '100%',
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '30px',
  height: '22px',
  padding: '0 6px',
  borderRadius: theme.radius.full,
  background: theme.colors.bgMuted,
  fontSize: theme.fonts.sizes['2xs'],
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
};

function TipoCard({ icon, label, onClick, emoji }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...cardStyle,
        border: 'none',
        cursor: 'pointer',
        fontFamily: theme.fonts.family,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.colors.bgMuted, fontSize: '24px' }}>
        {icon ? (
          <img src={icon} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          emoji
        )}
      </span>
      <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, textAlign: 'center' }}>
        {label}
      </span>
    </button>
  );
}

// Pantalla "2-Reglas": Reglamentos del condominio. Acceso a las reglas de
// Residente Permanente / Huésped Temporal / Guardia de Seguridad, y listado
// de departamentos con su estado de inscripción (Inscripto / No inscripto /
// Pendiente) y acciones de comunicación.
export default function ReglasPage() {
  const navigate = useNavigate();
  const { addToast, rolActivo } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [torreFiltro, setTorreFiltro] = useState('');
  const [deptoFiltro, setDeptoFiltro] = useState('');
  const [pisoFiltro, setPisoFiltro] = useState('');

  const [accionesDept, setAccionesDept] = useState(null);

  const filtered = reglasDepartamentos.filter(d => {
    const matchSearch = !search
      || d.departamento.toLowerCase().includes(search.toLowerCase())
      || d.responsable.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todos' || d.estado === activeTab;
    return matchSearch && matchTab;
  });

  const handleComunicacion = (tipo) => {
    setAccionesDept(null);
    if (tipo === 'llamar') navigate('/llamar');
    else if (tipo === 'whatsapp') navigate('/chat');

  };

  return (
    <AppShell>
      <PageHeader title="Reglamentos" action={<ModuloHeaderInfo helpKey="reglas" />} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <TipoCard icon={iconResidentePermanente} label="Residente Permanente" onClick={() => navigate('/reglas/residente-permanente')} />
          <TipoCard icon={iconResidenteTemporal} label="Huésped Temporal" onClick={() => navigate('/reglas/huesped-temporal')} />
          <TipoCard label="Guardia de Seguridad" emoji="🔒" onClick={() => navigate('/reglas/guardia-seguridad')} />
        </div>

        <div style={{ ...cardStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SearchBar value={search} onChange={setSearch} />
          <StatusTabs
            tabs={TABS}
            active={activeTab}
            onChange={tab => setActiveTab(tab || 'Todos')}
            centered
            statusColors={{ Pendiente: { bg: theme.colors.secondary, color: '#fff' } }}
          />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                background: theme.colors.bgMuted,
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '24px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms, background 200ms',
              }}
              aria-label={filterOpen ? 'Cerrar filtros' : 'Abrir filtros'}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <SelectField label="Torre" value={torreFiltro} options={reglasTorres} onChange={setTorreFiltro} placeholder="Torre" />
                <SelectField label="Departamento" value={deptoFiltro} options={reglasDepartamentosFiltro} onChange={setDeptoFiltro} placeholder="Departamento" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <SelectField label="Piso" value={pisoFiltro} options={reglasPisos} onChange={setPisoFiltro} placeholder="Piso" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setFilterOpen(false)}
                  style={{
                    background: theme.colors.bgMuted,
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.colors.textSecondary,
                    fontSize: '24px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Cerrar filtros"
                >
                  ▴
                </button>
              </div>
            </div>
          )}
        </div>

        {filtered.map(dept => (
          <div key={dept.id} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={iconDepartamento} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                {dept.departamento}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>
                Responsable: {dept.responsable}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ ...badgeStyle, background: dept.estado === 'Inscripto' ? theme.colors.successLight : theme.colors.iconAmberBg }}>📣</span>
                <img src={iconRnt} alt="RNT" style={{ height: '22px', borderRadius: theme.radius.full, objectFit: 'cover' }} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAccionesDept(dept)}
              aria-label="Más acciones"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: theme.colors.bgMuted,
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: theme.colors.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ⋮
            </button>
          </div>
        ))}

        <div style={{ height: '24px' }} />
      </div>

      {/* Menú de acciones por departamento */}
      <Modal isOpen={!!accionesDept} onClose={() => setAccionesDept(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" onClick={() => handleComunicacion('correo')} style={pillButtonStyle}>Enviar Correo</button>
          <button type="button" onClick={() => handleComunicacion('llamar')} style={pillButtonStyle}>Llamar teléfono</button>
          <button type="button" onClick={() => handleComunicacion('whatsapp')} style={pillButtonStyle}>Enviar Whatsapp</button>
        </div>
      </Modal>
    </AppShell>
  );
}
