import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Toggle from '../../components/ui/Toggle';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';

const sectionCard = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  padding: '20px',
  boxShadow: theme.shadows.card,
};

const REPORTES = [
  { id: 'visitantes', label: 'Visitantes y vehículos', icon: '\uD83D\uDC65' },
  { id: 'correspondencia', label: 'Correspondencia', icon: '\uD83D\uDCEB' },
  { id: 'areas-comunes', label: 'Áreas comunes', icon: '\uD83C\uDFD7\uFE0F' },
];

function formatearFecha(d) {
  return d.toLocaleDateString('es-AR');
}

export default function AdministradorReportesPage() {
  const { usuario, addToast, coadministradores } = useApp();

  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [todoHistorial, setTodoHistorial] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [generando, setGenerando] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [envioAutomatico, setEnvioAutomatico] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);

  const emailAdmin = usuario?.correo || 'admin@veciyo.com';
  const coadminEmails = coadministradores?.map(c => c.correo).filter(Boolean) || [];

  const handleGenerar = () => {
    if (!todoHistorial && (!fechaDesde || !fechaHasta)) {
      addToast('Debes seleccionar un rango de fechas o marcar "Todo el historial"', 'warning');
      return;
    }
    setGenerando(true);
    setTimeout(() => {
      setGenerando(false);
      setShowSuccess(true);
    }, 2000);
  };

  const handleActivarAuto = () => {
    setEnvioAutomatico(true);
    setShowAutoModal(false);
    addToast('Envío automático mensual activado. Se enviará el día 30/31 de cada mes.', 'success');
  };

  return (
    <AppShell>
      <PageHeader title="Reportes" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!reporteSeleccionado && (
          <>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.textSecondary, textAlign: 'center', margin: 0 }}>
              Seleccioná el reporte que querés generar
            </p>
            {REPORTES.map(r => (
              <button
                key={r.id}
                onClick={() => setReporteSeleccionado(r)}
                style={{
                  ...sectionCard,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: theme.colors.bgMuted, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0,
                }}>
                  {r.icon}
                </div>
                <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                  {r.label}
                </span>
              </button>
            ))}

            <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center' }}>
                Envío automático mensual
              </div>
              <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                Al activarlo, el día 30/31 de cada mes se enviarán automáticamente los 3 reportes consolidados al correo del Administrador y de los Coadministradores.
              </p>
              {envioAutomatico ? (
                <div style={{
                  background: '#F0FDF4', borderRadius: theme.radius.lg, padding: '12px',
                  textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: '#166534',
                }}>
                  {'\u2705'} Envío automático mensual activado
                </div>
              ) : (
                <Button variant="primary" fullWidth onClick={() => setShowAutoModal(true)}>
                  Activar envío automático mensual
                </Button>
              )}
            </div>
          </>
        )}

        {reporteSeleccionado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => setReporteSeleccionado(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm,
                color: theme.colors.primary, alignSelf: 'flex-start',
                display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
              }}
            >
              {'\u2190'} Volver
            </button>

            <div style={{ ...sectionCard, textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{reporteSeleccionado.icon}</div>
              <h3 style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
                {reporteSeleccionado.label}
              </h3>
            </div>

            <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, textAlign: 'center' }}>
                Rango de fechas
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Toggle value={todoHistorial} onChange={setTodoHistorial} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Todo el historial</span>
              </div>

              {!todoHistorial && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Desde</div>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg,
                        border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family, color: theme.colors.text,
                        background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Hasta</div>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg,
                        border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family, color: theme.colors.text,
                        background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box',
                      }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
                El reporte se enviará a:
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, textAlign: 'center', fontWeight: theme.fonts.weights.medium }}>
                {emailAdmin}
              </div>
              {coadminEmails.length > 0 && (
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, textAlign: 'center' }}>
                  CC: {coadminEmails.join(', ')}
                </div>
              )}
            </div>

            <Button variant="primary" fullWidth onClick={handleGenerar} disabled={generando}>
              {generando ? 'Generando reporte...' : 'Generar y enviar por correo'}
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); setReporteSeleccionado(null); setTodoHistorial(false); setFechaDesde(''); setFechaHasta(''); }} title="Reporte generado">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>{'\u2705'}</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            El reporte de <strong>{reporteSeleccionado?.label}</strong> fue generado y enviado a <strong>{emailAdmin}</strong>
            {coadminEmails.length > 0 && ` con copia a ${coadminEmails.length} coadministrador(es)`}.
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>
            {todoHistorial ? 'Historial completo' : `Período: ${fechaDesde} a ${fechaHasta}`}
          </p>
          <Button variant="primary" fullWidth onClick={() => { setShowSuccess(false); setReporteSeleccionado(null); setTodoHistorial(false); setFechaDesde(''); setFechaHasta(''); }}>
            Aceptar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showAutoModal} onClose={() => setShowAutoModal(false)} title="Envío automático mensual">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>{'\uD83D\uDCC5'}</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            Se enviarán automáticamente los 3 reportes consolidados el día 30/31 de cada mes a las 12:00 a.m.
          </p>
          <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
            Destinatarios: <strong>{emailAdmin}</strong>{coadminEmails.length > 0 ? `, ${coadminEmails.join(', ')}` : ''}
          </div>
          <Button variant="primary" fullWidth onClick={handleActivarAuto}>Activar</Button>
          <Button variant="ghost" fullWidth onClick={() => setShowAutoModal(false)}>Cancelar</Button>
        </div>
      </Modal>

      <div style={{ height: '24px' }} />
    </AppShell>
  );
}
