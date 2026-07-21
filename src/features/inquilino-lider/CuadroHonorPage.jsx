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
import ReconocimientoPopup from './components/ReconocimientoPopup';
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

const CUOTA_MENSUAL = 150;

export default function CuadroHonorPage() {
  const navigate = useNavigate();
  const { addToast, rolActivo, esResidente } = useApp();

  const [search, setSearch] = useState('');
  const [showReconocimientoPopup, setShowReconocimientoPopup] = useState(false);
  const [reconocimientoDestinatario, setReconocimientoDestinatario] = useState('');

  const totalDeptos = cuadroHonorDepartamentos.length;
  const alDiaCount = cuadroHonorDepartamentos.filter(d => d.estado === 'Al día').length;
  const atrasadoCount = cuadroHonorDepartamentos.filter(d => d.estado === 'Atrasado' || d.estado === 'Deudor').length;
  const porcentajeCobranza = totalDeptos > 0 ? Math.round((alDiaCount / totalDeptos) * 100) : 0;
  const totalEsperado = totalDeptos * CUOTA_MENSUAL;
  const totalRecibido = alDiaCount * CUOTA_MENSUAL;

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
        {/* Payment statistics */}
        <div style={{ ...cardStyle, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '2px' }}>
              Cobranza del mes — Cuota de administración
            </div>
            <div style={{
              fontSize: '40px',
              fontWeight: theme.fonts.weights.bold,
              color: porcentajeCobranza >= 80 ? theme.colors.success : porcentajeCobranza >= 50 ? theme.colors.primary : theme.colors.danger,
            }}>
              {porcentajeCobranza}%
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
              ${totalRecibido.toLocaleString()} de ${totalEsperado.toLocaleString()} recibido
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                <span>Al día</span>
                <span>{alDiaCount} / {totalDeptos}</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                <div style={{ width: `${(alDiaCount / totalDeptos) * 100}%`, height: '100%', background: theme.colors.success, borderRadius: theme.radius.full, transition: 'width 300ms' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                <span>Con retraso / Deudor</span>
                <span>{atrasadoCount} / {totalDeptos}</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                <div style={{ width: `${(atrasadoCount / totalDeptos) * 100}%`, height: '100%', background: theme.colors.dangerLight || '#FECACA', borderRadius: theme.radius.full, transition: 'width 300ms' }} />
              </div>
            </div>
          </div>
        </div>

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
