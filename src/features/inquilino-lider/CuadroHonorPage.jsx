import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import {
  cuadroHonorDepartamentos,
  reputacionInsigniasVecino,
} from '../../data/mockData';
import GratitudPopup from './components/GratitudPopup';
import iconDepartamento from '../../assets/icons/inquilino-lider/reconocimiento-hero.png';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: theme.fonts.sizes['2xs'],
  fontWeight: theme.fonts.weights.semibold,
  lineHeight: 1.4,
};

export default function CuadroHonorPage() {
  const navigate = useNavigate();
  const { addToast, rolActivo, esResidente } = useApp();

  const [search, setSearch] = useState('');
  const [showGratitudPopup, setShowGratitudPopup] = useState(false);
  const [gratitudDestinatario, setGratitudDestinatario] = useState('');

  // F23: Porcentaje de cobranza del mes
  const totalDeptos = cuadroHonorDepartamentos.length;
  const alDiaCount = cuadroHonorDepartamentos.filter(d => d.estado === 'Al día').length;
  const porcentajeCobranza = totalDeptos > 0 ? Math.round((alDiaCount / totalDeptos) * 100) : 0;

  // F25: Estado "al día" se determina por departamento — solo mostrar los al día (F23)
  const filtered = cuadroHonorDepartamentos.filter(d => {
    const matchSearch = !search
      || d.departamento.toLowerCase().includes(search.toLowerCase())
      || d.responsable.toLowerCase().includes(search.toLowerCase());
    const matchAlDia = d.estado === 'Al día';
    return matchSearch && matchAlDia;
  });

  // Para el ícono de regalo (F21)
  const handleOpenGratitud = (nombre) => {
    setGratitudDestinatario(nombre);
    setShowGratitudPopup(true);
  };

  // F28: Guardia no tiene acceso
  const esGuardia = rolActivo === 'guardia';
  // F29: Solo residentes dan/reciben reconocimientos; propietarios no-residentes pueden ver
  const puedeParticipar = esResidente && !esGuardia;
  const puedeVerPagina = !esGuardia;

  return (
    <AppShell>
      <PageHeader
        title="Cuadro de Honor"
      />

      <ModuloGate helpKey="ranking">
      {puedeVerPagina && (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* F23: Porcentaje de cobranza del mes */}
        <div style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
            Cobranza del mes
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: theme.fonts.weights.bold,
            color: porcentajeCobranza >= 80 ? theme.colors.success : porcentajeCobranza >= 50 ? theme.colors.primary : theme.colors.danger,
          }}>
            {porcentajeCobranza}%
          </div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
            {alDiaCount} de {totalDeptos} departamentos al día
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {filtered.map(dept => (
          <div
            key={dept.id}
            style={{
              ...cardStyle,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={iconDepartamento} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                  {dept.departamento}
                </div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                  Responsable: {dept.responsable}
                </div>
              </div>
              <span style={{
                ...badgeStyle,
                background: theme.colors.successLight,
                color: theme.colors.success,
              }}>
                Al día
              </span>
            </div>

            {/* F24: Reputation badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {reputacionInsigniasVecino.map(ins => (
                <span key={ins.key} style={{
                  ...badgeStyle,
                  background: '#F3F4F6',
                  color: theme.colors.textSecondary,
                }}>
                  {ins.icono} {ins.cantidad}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {puedeParticipar && (
              // F21: Gift icon opens GratitudPopup
              <button
                type="button"
                onClick={() => handleOpenGratitud(dept.responsable)}
                aria-label="Dar regalo"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: theme.colors.primaryLight,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                🎁
              </button>
              )}
            </div>
          </div>
        ))}

        <div style={{ height: '24px' }} />
      </div>
      )}

      {/* Si no puede ver la página */}
      {!puedeVerPagina && (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
          El Guardia de Seguridad no tiene acceso al Cuadro de Honor.
        </div>
      )}
      </ModuloGate>

      <GratitudPopup
        isOpen={showGratitudPopup && puedeParticipar}
        onClose={() => { setShowGratitudPopup(false); setGratitudDestinatario(''); }}
        destinatarioPreseleccionado={gratitudDestinatario}
      />
    </AppShell>
  );
}
