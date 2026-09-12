import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import sosIlustracion from '../../assets/branding/sos.png';

export default function SOSPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const cancelarAlarma = () => {
    navigate(-1);
  };

  const llegoGuardia = () => {
    navigate(-1);
  };

  return (
    <AppShell>
      <PageHeader title="S.O.S" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          background: theme.colors.bgCard,
          borderRadius: theme.radius.xl,
          boxShadow: theme.shadows.card,
          padding: '20px 16px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: theme.fonts.sizes.lg,
            fontWeight: theme.fonts.weights.extrabold,
            color: theme.colors.text,
            lineHeight: theme.fonts.lineHeights.relaxed,
            margin: 0,
          }}>
            ¡ALARMA SONORA ACTIVADA TODOS LOS GUARDIAS SERAN NOTIFICADOS!
          </p>
        </div>

        <div style={{
          height: '220px',
          borderRadius: theme.radius.xl,
          boxShadow: theme.shadows.card,
          overflow: 'hidden',
        }}>
          <img src={sosIlustracion} alt="S.O.S" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <Button variant="danger" fullWidth onClick={cancelarAlarma}>
          🔕 Cancelar alarma
        </Button>
        <Button variant="primary" fullWidth onClick={llegoGuardia}>
          🛡️ Llego el guardia
        </Button>
      </div>
    </AppShell>
  );
}
