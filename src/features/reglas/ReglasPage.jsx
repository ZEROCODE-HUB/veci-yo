import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import {
  reglasEstados,
  reglasDepartamentos,
  reglasTorres,
  reglasDepartamentosFiltro,
  reglasPisos,
  reglasPuntuaciones,
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

function TipoCard({ icon, label, onClick }) {
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
      <span style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={icon} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
      <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, textAlign: 'center' }}>
        {label}
      </span>
    </button>
  );
}

// Pantalla "2-Reglas": Reglamentos del condominio. Acceso a las reglas de
// Residente Permanente / Huésped Temporal, beneficios del programa VeciYo
// Huésped Temporal, y listado de departamentos con su estado de inscripción
// (Inscripto / No inscripto / Pendiente) y acciones de comunicación.
export default function ReglasPage() {
  const navigate = useNavigate();
  const { addToast, rolActivo } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [torreFiltro, setTorreFiltro] = useState('');
  const [deptoFiltro, setDeptoFiltro] = useState('');
  const [pisoFiltro, setPisoFiltro] = useState('');
  const [puntuacionFiltro, setPuntuacionFiltro] = useState('');

  const [accionesDept, setAccionesDept] = useState(null);
  const [sinSuscripcionActiva] = useState(true);
  const [showBeneficioModal, setShowBeneficioModal] = useState(false);

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
    else addToast('Funcionalidad en desarrollo');
  };

  return (
    <AppShell>
      <PageHeader title="Reglamentos" action={<ModuloHeaderInfo helpKey="reglas" />} />

      <ModuloGate helpKey="reglas">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <TipoCard icon={iconResidentePermanente} label="Residente Permanente" onClick={() => navigate('/reglas/residente-permanente')} />
          {rolActivo === 'administrador' && (
            <button
              type="button"
              onClick={() => navigate('/reglas/guardia-seguridad')}
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
              <span style={{ width: '56px', height: '56px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={28} color={theme.colors.text} />
              </span>
              <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, textAlign: 'center' }}>
                Guardia de Seguridad
              </span>
            </button>
          )}
          <TipoCard icon={iconResidenteTemporal} label="Huésped Temporal" onClick={() => navigate('/reglas/huesped-temporal')} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            ...cardStyle,
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            opacity: 0.5,
            border: `1.5px dashed ${theme.colors.border}`,
          }}>
            <span style={{ width: '56px', height: '56px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              📄
            </span>
            <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textMuted, textAlign: 'center', fontStyle: 'italic' }}>
              Documento pendiente de definición
            </span>
          </div>
          <div style={{
            ...cardStyle,
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            opacity: 0.5,
            border: `1.5px dashed ${theme.colors.border}`,
          }}>
            <span style={{ width: '56px', height: '56px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              📄
            </span>
            <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textMuted, textAlign: 'center', fontStyle: 'italic' }}>
              Documento pendiente de definición
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (sinSuscripcionActiva) {
              setShowBeneficioModal(true);
            } else {
              navigate('/reglas/veciyo-huesped-temporal');
            }
          }}
          style={{
            ...cardStyle,
            border: 'none',
            cursor: 'pointer',
            fontFamily: theme.fonts.family,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left',
            width: '100%',
            opacity: sinSuscripcionActiva ? 0.5 : 1,
          }}
        >
          <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            📋
          </span>
          <span style={{ flex: 1 }}>
            <div style={{ fontSize: theme.fonts.sizes.base, color: sinSuscripcionActiva ? theme.colors.textMuted : theme.colors.text }}>VeciYo huéspedes temporales</div>
            <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: sinSuscripcionActiva ? theme.colors.textMuted : theme.colors.secondary }}>BENEFICIOS</div>
          </span>
          <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: sinSuscripcionActiva ? theme.colors.border : theme.colors.dangerLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
            ▶️
          </span>
        </button>

        {/* Modal de suscripción inactiva */}
        <Modal isOpen={showBeneficioModal} onClose={() => setShowBeneficioModal(false)} title="VeciYo Huésped Temporal">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '100%', height: '180px', borderRadius: theme.radius.xl, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
              ▶️
            </div>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
              Los primeros 30 días son gratuitos. ¡Suscríbete y disfruta de todos los beneficios!
            </p>
            <Button variant="primary" fullWidth onClick={() => { setShowBeneficioModal(false); addToast('Redirigiendo a suscripción...'); }}>
              Suscribirse
            </Button>
          </div>
        </Modal>

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
                <SelectField label="Puntuación" value={puntuacionFiltro} options={reglasPuntuaciones} onChange={setPuntuacionFiltro} placeholder="Puntuación" />
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
      </ModuloGate>

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
