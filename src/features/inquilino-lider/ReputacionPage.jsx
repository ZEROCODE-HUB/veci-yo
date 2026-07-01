import { useState } from 'react';
import { Share } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import QRDisplay from '../../components/ui/QRDisplay';
import theme from '../../config/theme';
import { reputacionInsignias } from '../../data/mockData';
import iconLogro5 from '../../assets/icons/inquilino-lider/medalla-logro5.png';
import iconOro from '../../assets/icons/inquilino-lider/reconocimiento-medalla-oro.png';
import iconLogro3 from '../../assets/icons/inquilino-lider/medalla-logro3.png';
import iconLogro4 from '../../assets/icons/inquilino-lider/medalla-logro4.png';
import iconReciclador from '../../assets/icons/inquilino-lider/medalla-reciclador.png';

const ICONOS = {
  logro5: { src: iconLogro5, scale: 1 },
  oro: { src: iconOro, scale: 1 },
  logro3: { src: iconLogro3, scale: 1.15 },
  logro4: { src: iconLogro4, scale: 1.15 },
  reciclador: { src: iconReciclador, scale: 1.19 },
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

function InsigniaIcon({ icono }) {
  const data = ICONOS[icono];
  return (
    <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={data.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${data.scale})` }} />
    </div>
  );
}

function InsigniaRow({ insignia, isLast }) {
  const pct = Math.round((insignia.progreso / insignia.total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: isLast ? 'none' : `1px solid ${theme.colors.borderLight}` }}>
      <InsigniaIcon icono={insignia.icono} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '6px' }}>
          {insignia.label} {insignia.progreso}/{insignia.total}
        </div>
        <div style={{ height: '6px', borderRadius: theme.radius.full, background: theme.colors.border, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: theme.radius.full, background: theme.colors.secondary }} />
        </div>
      </div>
      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium, flexShrink: 0, textAlign: 'right' }}>
        Nivel {insignia.nivel}/{insignia.nivelTotal}
      </div>
    </div>
  );
}

function InsigniaCard({ titulo, items, onShare }) {
  return (
    <div style={{ ...cardStyle, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
          {titulo}
        </h2>
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartir reputación"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: theme.colors.primary,
            border: 'none',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Share size={18} color={theme.colors.text} />
        </button>
      </div>
      {items.map((item, i) => (
        <InsigniaRow key={item.key} insignia={item} isLast={i === items.length - 1} />
      ))}
    </div>
  );
}

// Pantalla "1-Reputación": tabla de insignias acumuladas por el Inquilino Líder
// (como inquilino y como propietario), con su nivel de cumplimiento y acceso
// a un link/QR temporal para compartir la reputación.
export default function ReputacionPage() {
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader title="Reputación" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
          En esta tabla verás las medallas recolectadas por los integrantes de su condominio y su estado de cumplimiento.
        </p>

        <InsigniaCard titulo="Insignia Inquilino" items={reputacionInsignias.inquilino} onShare={() => setLinkOpen(true)} />
        <InsigniaCard titulo="Insignia Propietario" items={reputacionInsignias.propietario} onShare={() => setLinkOpen(true)} />

        <div style={{ height: '24px' }} />
      </div>

      {/* Link temporal de reputación */}
      <Modal isOpen={linkOpen} onClose={() => setLinkOpen(false)} title="Link temporal de reputación">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.6, margin: 0 }}>
            Este link es válido por 48 hs desde su generación en la app.
          </p>
          <QRDisplay url="wwww.veciyolink/2342342.com" />
          <Button variant="primary" fullWidth onClick={() => setLinkOpen(false)}>Aceptar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
