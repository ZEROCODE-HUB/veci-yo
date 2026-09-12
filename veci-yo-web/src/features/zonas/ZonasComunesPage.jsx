import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import { zonasComunes } from '../../data/mockData';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import zonaIcons from '../../assets/icons/zonas';
import MisReservas from './components/MisReservas';

export default function ZonasComunesPage() {
  const navigate = useNavigate();
  const { rolActivo, esResidente } = useApp();
  const accesoBloqueado = rolActivo === 'propietario' && !esResidente;
  const esHuesped = rolActivo === 'huesped-temporal';
  const [zonaRestringidaInfo, setZonaRestringidaInfo] = useState(null);
  const [showAvisoHuesped, setShowAvisoHuesped] = useState(false);

  useEffect(() => {
    if (esHuesped) {
      setShowAvisoHuesped(true);
    }
  }, [esHuesped]);

  return (
    <AppShell>
      {accesoBloqueado ? (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base, marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <p>No tienes acceso a Zonas Comunes. Solo los Residentes pueden usar esta función.</p>
        </div>
      ) : (<>
      <PageHeader title="Zonas Comunes" action={<ModuloHeaderInfo helpKey="zonas" />} />
      <div style={{ padding: '16px 16px 0' }}>
        <MisReservas collapsible />
      </div>
      <ModuloGate helpKey="zonas">
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {zonasComunes.map(zona => {
            const zonaRestringida = esHuesped && zona.restringidaHuesped;
            return (
            <button
              key={zona.id}
              onClick={() => zonaRestringida ? setZonaRestringidaInfo(zona) : navigate(`/zonas-comunes/${zona.id}`)}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                boxShadow: theme.shadows.card,
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                border: 'none',
                position: 'relative',
                opacity: zonaRestringida ? 0.5 : 1,
                filter: zonaRestringida ? 'grayscale(1)' : 'none',
              }}
            >
              <img
                src={zonaIcons[zona.id]}
                alt={zona.nombre}
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span
                style={{
                  fontSize: theme.fonts.sizes.sm,
                  fontWeight: theme.fonts.weights.semibold,
                  color: theme.colors.text,
                }}
              >
                {zona.nombre}
              </span>
            </button>
          ); })}
        </div>
      </div>
      </ModuloGate>
      </>)}

      {/* Aviso para huéspedes temporales al entrar */}
      <Modal isOpen={showAvisoHuesped} onClose={() => setShowAvisoHuesped(false)} title="Aviso importante">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>ℹ️</div>
          <p style={{ margin: 0, fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.6 }}>
            Algunas zonas comunes pueden estar restringidas para huéspedes de renta corta por la administración.
          </p>
          <Button variant="primary" fullWidth onClick={() => setShowAvisoHuesped(false)}>Aceptar</Button>
        </div>
      </Modal>

      {/* Explicación de zona restringida (Huésped Temporal) */}
      <Modal isOpen={!!zonaRestringidaInfo} onClose={() => setZonaRestringidaInfo(null)} title="Zona restringida">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>🚫</div>
          <p style={{ margin: 0, fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.6 }}>
            La zona <strong>{zonaRestringidaInfo?.nombre}</strong> no está disponible para Huéspedes Temporales. Es una regla del edificio que restringe el acceso a esta zona común para estancias temporales.
          </p>
          <Button variant="primary" fullWidth onClick={() => setZonaRestringidaInfo(null)}>Entendido</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
