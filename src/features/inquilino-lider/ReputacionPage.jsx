import { useState } from 'react';
import { Share } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import QRDisplay from '../../components/ui/QRDisplay';
import theme from '../../config/theme';
import { reputacionInsigniasVecino } from '../../data/mockData';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

function InsigniaRow({ insignia, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: isLast ? 'none' : `1px solid ${theme.colors.borderLight}` }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: theme.colors.iconAmberBg || '#FEF3C7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '24px',
      }}>
        {insignia.icono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '4px' }}>
          {insignia.label}
        </div>
      </div>
      <div style={{
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.secondary,
        flexShrink: 0,
        textAlign: 'right',
      }}>
        {insignia.cantidad}
      </div>
    </div>
  );
}

export default function ReputacionPage() {
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <AppShell>
      <PageHeader title="Reputación" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
          Tus Insignias de vecino reconocen tu participación y buenas acciones en la comunidad.
        </p>

        <div style={{ ...cardStyle, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
              Insignias de vecino
            </h2>
            <button
              type="button"
              onClick={() => setLinkOpen(true)}
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
          {reputacionInsigniasVecino.map((item, i) => (
            <InsigniaRow key={item.key} insignia={item} isLast={i === reputacionInsigniasVecino.length - 1} />
          ))}
        </div>

        <div style={{ height: '24px' }} />
      </div>

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
