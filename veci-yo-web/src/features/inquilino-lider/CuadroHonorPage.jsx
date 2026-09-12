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
  cuotaAdministracionHistorial,
} from '../../data/mockData';
import ReconocimientoPopup from './components/ReconocimientoPopup';
import CarruselCuotas from './components/CarruselCuotas';
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
  const { addToast, rolActivo, esResidente, pagosMantenimiento, unidades } = useApp();
  const pagadosCount = Object.values(pagosMantenimiento).filter(Boolean).length;
  const noPagados = unidades.length - pagadosCount;

  const [search, setSearch] = useState('');
  const [showReconocimientoPopup, setShowReconocimientoPopup] = useState(false);
  const [reconocimientoDestinatario, setReconocimientoDestinatario] = useState('');

  const filtered = cuadroHonorDepartamentos.filter(d => {
    const matchSearch = !search
      || d.departamento.toLowerCase().includes(search.toLowerCase())
      || d.responsable.toLowerCase().includes(search.toLowerCase());
    const matchAlDia = d.estado === 'Al día';
    return matchSearch && matchAlDia;
  });

  const handleOpenReconocimiento = (nombre) => {
    setReconocimientoDestinatario(nombre || '');
    setShowReconocimientoPopup(true);
  };

  const esGuardia = rolActivo === 'guardia';
  const puedeParticipar = esResidente && !esGuardia;
  const puedeVerPagina = !esGuardia;

  return (
    <AppShell>
      <PageHeader title="Cuadro de Honor" />

      <ModuloGate helpKey="ranking">
      {puedeVerPagina && (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Histórico de cuota de administración por mes (carrusel, incluye mes actual) */}
        <CarruselCuotas historial={cuotaAdministracionHistorial} />
        {pagadosCount>0 && (
          <div style={{ ...cardStyle, padding:'12px', display:'flex', justifyContent:'space-around', textAlign:'center' }}>
            <div><div style={{ fontWeight:'bold', fontSize: theme.fonts.sizes.lg }}>{pagadosCount}</div><div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Pagaron</div></div>
            <div><div style={{ fontWeight:'bold', fontSize: theme.fonts.sizes.lg }}>{noPagados}</div><div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>No pagaron</div></div>
          </div>
        )}

        {/* Dar reconocimiento button */}
        {puedeParticipar && (
          <button
            type="button"
            onClick={() => handleOpenReconocimiento('')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: theme.radius.full,
              background: theme.colors.secondary,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              fontSize: theme.fonts.sizes.base,
              fontWeight: theme.fonts.weights.semibold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            🎁 Dar reconocimiento
          </button>
        )}

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
              <button
                type="button"
                onClick={() => handleOpenReconocimiento(dept.responsable)}
                aria-label="Dar reconocimiento"
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

      {!puedeVerPagina && (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
          El Guardia de Seguridad no tiene acceso al Cuadro de Honor.
        </div>
      )}
      </ModuloGate>

      <ReconocimientoPopup
        isOpen={showReconocimientoPopup && puedeParticipar}
        onClose={() => { setShowReconocimientoPopup(false); setReconocimientoDestinatario(''); }}
        destinatarioPreseleccionado={reconocimientoDestinatario}
      />
    </AppShell>
  );
}
