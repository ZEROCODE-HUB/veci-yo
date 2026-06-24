import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import StatusTabs from '../../components/ui/StatusTabs';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';

const ESTADOS_ADMIN = ['Pendiente', 'En curso', 'Completo'];

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
  padding: '16px',
};

const labelStyle = {
  fontSize: theme.fonts.sizes.sm,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  textDecoration: 'underline',
  marginBottom: '6px',
};

export default function ReclamoDetallePage() {
  const { id } = useParams();
  const { reclamos, rolActivo, actualizarEstadoReclamo, actualizarEstadoReclamoConMensaje, addToast } = useApp();
  const reclamo = reclamos.find(r => String(r.id) === id);
  const esAdmin = rolActivo === 'administrador';

  const [resolucionOpen, setResolucionOpen] = useState(false);
  const [mensajeResolucion, setMensajeResolucion] = useState('');

  // Auto-advance Pendiente → En curso for admin
  useEffect(() => {
    if (esAdmin && reclamo && reclamo.estado === 'Pendiente') {
      actualizarEstadoReclamoConMensaje(reclamo.id, 'En curso', 'Su reclamo está siendo revisado');
    }
  }, [esAdmin, reclamo?.id, reclamo?.estado]);

  if (!reclamo) {
    return (
      <AppShell>
        <PageHeader title="Reclamo" />
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary }}>
          No se encontró el reclamo.
        </div>
      </AppShell>
    );
  }

  const handleEstadoChange = (estado) => {
    if (!estado) return;
    if (reclamo.estado === 'Completo') {
      addToast('El reclamo está cerrado. No se puede cambiar el estado.', 'error');
      return;
    }
    if (estado === 'Completo') {
      setResolucionOpen(true);
      return;
    }
    actualizarEstadoReclamo(reclamo.id, estado);
  };

  const handleResolver = () => {
    if (!mensajeResolucion.trim()) {
      addToast('Debe ingresar un mensaje de resolución', 'error');
      return;
    }
    actualizarEstadoReclamoConMensaje(reclamo.id, 'Completo', mensajeResolucion.trim());
    setResolucionOpen(false);
    setMensajeResolucion('');
  };

  const handleStatusClick = (estado) => {
    if (!esAdmin) {
      addToast('Solo el administrador puede cambiar el estado', 'error');
      return;
    }
    handleEstadoChange(estado);
  };

  return (
    <AppShell>
      <PageHeader title={`Reclamo N°: ${reclamo.numero}`} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '10px' }}>
            Reclamo
          </div>

          <div style={labelStyle}>Título</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginTop: 0, marginBottom: '16px' }}>
            {reclamo.titulo}
          </p>

          <div style={labelStyle}>Descripción:</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginTop: 0, whiteSpace: 'pre-line' }}>
            {reclamo.descripcion}
          </p>

          {reclamo.resolucionAdmin && (
            <>
              <div style={{ ...labelStyle, marginTop: '16px' }}>Resolución:</div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginTop: 0, whiteSpace: 'pre-line', background: theme.colors.successLight, padding: '12px', borderRadius: theme.radius.md }}>
                {reclamo.resolucionAdmin}
              </p>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textDecoration: 'underline' }}>
            ESTADO ▾
          </span>
          {esAdmin ? (
            <StatusTabs
              tabs={ESTADOS_ADMIN}
              active={reclamo.estado}
              onChange={estado => handleStatusClick(estado)}
              centered
            />
          ) : (
            <div style={{
              padding: '8px 24px',
              borderRadius: theme.radius.full,
              background: reclamo.estado === 'Completo' ? theme.colors.successLight : theme.colors.statusYellow,
              color: reclamo.estado === 'Completo' ? theme.colors.success : theme.colors.text,
              fontWeight: theme.fonts.weights.semibold,
              fontSize: theme.fonts.sizes.sm,
            }}>
              {reclamo.estado}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{reclamo.fechaCreacion}</span>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{reclamo.fechaRevision}</span>
        </div>
      </div>

      <Modal isOpen={resolucionOpen} onClose={() => setResolucionOpen(false)} title="Resolver Reclamo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField
            label="Mensaje de resolución*"
            value={mensajeResolucion}
            onChange={setMensajeResolucion}
            placeholder="Describa cómo se resolvió el reclamo..."
            multiline
            rows={4}
          />
          <Button variant="primary" fullWidth onClick={handleResolver}>Marcar como Resuelto</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
