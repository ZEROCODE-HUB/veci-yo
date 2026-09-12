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
import iconResidentePermanente1 from '../../assets/icons/reglas/residente-permanente-1.png';
import iconResidenteTemporal1 from '../../assets/icons/reglas/residente-temporal-1.png';
import iconGuardiaSeguridad1 from '../../assets/icons/reglas/guardia-seguridad-1.png';
import iconRnt from '../../assets/icons/shared/rnt.png';


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

function cumplimientoIcon(activo) {
  return {
    width: '26px', height: '26px', borderRadius: '50%',
    border: 'none', cursor: 'pointer', fontSize: '13px',
    background: activo ? theme.colors.successLight : theme.colors.bgMuted,
    opacity: activo ? 1 : 0.4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  };
}

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
  const { rolActivo, residentesPropietario } = useApp();
  const anfitrionPrimario = residentesPropietario.find(r => r.esAnfitrionPrimario);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [torreFiltro, setTorreFiltro] = useState('');
  const [deptoFiltro, setDeptoFiltro] = useState('');
  const [pisoFiltro, setPisoFiltro] = useState('');

  const [accionesDept, setAccionesDept] = useState(null);
  const [cumplimientoDept, setCumplimientoDept] = useState(null);

  const filtered = reglasDepartamentos.filter(d => {
    const matchSearch = !search
      || d.departamento.toLowerCase().includes(search.toLowerCase())
      || d.responsable.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const handleComunicacion = (tipo) => {
    const dept = accionesDept;
    setAccionesDept(null);
    if (tipo === 'anfitrion' && dept) window.location.href = `tel:${dept.telAnfitrion}`;
    else if (tipo === 'administrador' && dept) window.location.href = `tel:${dept.telAdmin}`;
    else if (tipo === 'propietario' && dept) window.location.href = `tel:${dept.telPropietario}`;
  };

  return (
    <AppShell>
      <PageHeader title="Reglamentos y renta corta" action={<ModuloHeaderInfo helpKey="reglas" />} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: rolActivo === 'huesped-temporal' ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          {rolActivo === 'huesped-temporal' ? (
            <TipoCard icon={iconResidenteTemporal1} label="Huésped Temporal" onClick={() => navigate('/reglas/huesped-temporal')} />
          ) : (
            <>
              <TipoCard icon={iconResidentePermanente1} label="Residente Permanente" onClick={() => navigate('/reglas/residente-permanente')} />
              <TipoCard icon={iconResidenteTemporal1} label="Huésped Temporal" onClick={() => navigate('/reglas/huesped-temporal')} />
              <TipoCard icon={iconGuardiaSeguridad1} label="Guardia de Seguridad" onClick={() => navigate('/reglas/guardia-seguridad')} />
            </>
          )}
        </div>

        {rolActivo !== 'huesped-temporal' && (
        <div style={{ ...cardStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Búsqueda de propiedad renta corta" />

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
            </div>
          )}
        </div>
        )}

        {rolActivo !== 'huesped-temporal' && (
        <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', padding: '4px 0' }}>
          Lista de departamentos habilitados para renta corta
        </div>
        )}

        {rolActivo === 'propietario' || rolActivo === 'inquilino-lider' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button type="button" onClick={() => navigate('/perfil/soporte/reclamos/nuevo', { state: { tipo: 'Reglas' } })} style={{ ...pillButtonStyle, background: theme.colors.secondary, color: '#fff' }}>
              Crear PQRS
            </button>
            <p style={{ margin: 0, fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: '1.4' }}>
              Este botón permite crear un reporte o solicitud de Pregunta, Queja, Reclamo o Solicitud (PQRS).
            </p>
          </div>
        ) : null}

        {rolActivo !== 'huesped-temporal' && filtered.map(dept => (
          <div key={dept.id} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={iconDepartamento} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                {dept.ocultarNumero ? 'Departamento (oculto)' : dept.departamento}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: '1.5' }}>
                Anfitrión: {anfitrionPrimario ? anfitrionPrimario.nombre : dept.anfitrion} {dept.telAnfitrion ? <span style={{ color: theme.colors.success, fontWeight: 'bold' }} title="Contacto completo">✓</span> : <span style={{ color: theme.colors.danger, fontWeight: 'bold' }} title="Contacto incompleto">✕</span>} {anfitrionPrimario && <span style={{ fontSize: '9px', background: theme.colors.primaryLight, color: theme.colors.primary, padding: '1px 5px', borderRadius: theme.radius.full }}>Primario</span>}<br />
                Administrador: {dept.administrador} {dept.telAdmin ? <span style={{ color: theme.colors.success, fontWeight: 'bold' }} title="Contacto completo">✓</span> : <span style={{ color: theme.colors.danger, fontWeight: 'bold' }} title="Contacto incompleto">✕</span>}<br />
                Propietario: {dept.propietario} {dept.telPropietario ? <span style={{ color: theme.colors.success, fontWeight: 'bold' }} title="Contacto completo">✓</span> : <span style={{ color: theme.colors.danger, fontWeight: 'bold' }} title="Contacto incompleto">✕</span>}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                <img src={iconRnt} alt="RNT" style={{ height: '22px', borderRadius: theme.radius.full, objectFit: 'cover' }} />
                {(dept.cumplimiento?.antirruido || dept.cumplimiento?.noFumar || dept.cumplimiento?.sensor) && (
                  <span style={{ display: 'inline-flex', gap: '4px' }}>
                    <button type="button" onClick={() => setCumplimientoDept(dept)} title="Dispositivo antirruido" style={cumplimientoIcon(dept.cumplimiento?.antirruido)}>🔇</button>
                    <button type="button" onClick={() => setCumplimientoDept(dept)} title="Señalética de no fumar" style={cumplimientoIcon(dept.cumplimiento?.noFumar)}>🚭</button>
                    <button type="button" onClick={() => setCumplimientoDept(dept)} title="Sensor de incendio/gas/CO2" style={cumplimientoIcon(dept.cumplimiento?.sensor)}>🔥</button>
                  </span>
                )}
                {dept.mascotas && (
                  <span style={{ ...badgeStyle, background: theme.colors.successLight, color: theme.colors.success }}>🐾 Mascotas</span>
                )}
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
        {rolActivo === 'guardia' || rolActivo === 'huesped-temporal' || rolActivo === 'administrador' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={() => handleComunicacion('anfitrion')} style={pillButtonStyle}>1er Contacto: Llamar Anfitrión</button>
            <button type="button" onClick={() => handleComunicacion('administrador')} style={pillButtonStyle}>2do Contacto: Llamar Administrador</button>
            <button type="button" onClick={() => handleComunicacion('propietario')} style={pillButtonStyle}>3er Contacto: Llamar Propietario</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={() => { const d = accionesDept; setAccionesDept(null); navigate('/perfil/soporte/reclamos/nuevo', { state: { tipo: 'Reglas', titulo: d?.departamento || '' } }); }} style={{ ...pillButtonStyle, background: theme.colors.secondary, color: '#fff' }}>
              Reportar PQRS con el departamento {accionesDept?.departamento || ''}
            </button>
          </div>
        )}
      </Modal>

      {/* Popup de cumplimiento del departamento */}
      <Modal isOpen={!!cumplimientoDept} onClose={() => setCumplimientoDept(null)} title="Cumplimiento del departamento">
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            {cumplimientoDept?.departamento}
          </div>
          {[
            { key: 'antirruido', icono: '🔇', label: 'Dispositivo antirruido' },
            { key: 'noFumar', icono: '🚭', label: 'Señalética de no fumar' },
            { key: 'sensor', icono: '🔥', label: 'Sensor de incendio/gas/CO2' },
          ].map(item => {
            const activo = !!cumplimientoDept?.cumplimiento?.[item.key];
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: theme.radius.md, background: theme.colors.bgMuted }}>
                <span style={{ fontSize: '18px' }}>{item.icono}</span>
                <span style={{ flex: 1, fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{item.label}</span>
                <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: activo ? theme.colors.success : theme.colors.danger }}>
                  {activo ? 'Registrado' : 'No registrado'}
                </span>
              </div>
            );
          })}
        </div>
      </Modal>
    </AppShell>
  );
}
