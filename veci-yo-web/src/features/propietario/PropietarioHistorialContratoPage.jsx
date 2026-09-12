import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import theme from '../../config/theme';

const CONTRACT_TEXT = `Los términos y condiciones de un contrato de alquiler entre un inquilino y un propietario regulan los derechos y obligaciones de ambas partes.
Derechos del inquilino
· Vivir en paz y sin interrupciones, lo que se conoce como "uso tranquilo"
· Quejarse con el propietario si otros inquilinos lo molestan
· Suspender el pago del alquiler si el propietario no cumple con sus obligaciones de mantenimiento
Obligaciones del inquilino
· Pagar la renta y otros gastos pactados en tiempo y forma
· Cuidar y mantener el inmueble
· Permitir el acceso al propietario para reparaciones
· No realizar obras sin consentimiento
· Respetar las normas de la comunidad
· Devolver el inmueble en buen estado
· Responder por los daños en el inmueble cuando son causados por él mismo, familiares o sus visitas
Plazos del contrato
· El plazo máximo de contrato es de 20 años para viviendas y 50 años para otros inmuebles
· Si no se estableció un plazo y se alquila el inmueble para vivienda permanente, se entiende que el contrato dura 2 años
· Si no se estableció un plazo y se alquila el inmueble para cualquier otra finalidad, se entiende que el contrato dura 3 años
En caso de dudas, se puede consultar con un abogado`;

const CONTRATOS = [
  { id: 1, numero: '16548', estado: 'Activa', rango: '01/12/2025 a 15/01/2026', fechaInicio: '21/12/2025', fechaFin: '21/12/2028' },
  { id: 2, numero: '16548', estado: 'Finalizado', rango: '01/12/2024 a 15/01/2025', fechaInicio: '21/12/2024', fechaFin: '21/12/2025' },
];

const ESTADO_ESTILOS = {
  Activa: { bg: theme.colors.primary, color: theme.colors.text },
  Finalizado: { bg: theme.colors.secondary, color: '#fff' },
};

export default function PropietarioHistorialContratoPage() {
  const [contratoActivo, setContratoActivo] = useState(null);
  const [showDescargar, setShowDescargar] = useState(false);

  const handleDescargar = () => {
    setShowDescargar(true);
  };

  return (
    <AppShell>
      <PageHeader title="Historial de Contrato" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CONTRATOS.map(c => {
          const est = ESTADO_ESTILOS[c.estado] || ESTADO_ESTILOS.Finalizado;
          return (
            <button
              key={c.id}
              onClick={() => setContratoActivo(c)}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '16px',
                boxShadow: theme.shadows.card,
                border: 'none', cursor: 'pointer',
                textAlign: 'left', width: '100%',
                fontFamily: theme.fonts.family,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                  Contrato N°: {c.numero}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: est.color, background: est.bg, borderRadius: theme.radius.full, padding: '4px 12px' }}>
                  {c.estado}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {c.rango}
                </div>
              </div>
            </button>
          );
        })}
        <div style={{ height: '24px' }} />
      </div>

      {/* Detalle contrato */}
      <Modal
        isOpen={!!contratoActivo && !showDescargar}
        onClose={() => setContratoActivo(null)}
        title={contratoActivo ? `Contrato N°: ${contratoActivo.numero}` : ''}
        headerAction={
          <button
            onClick={handleDescargar}
            style={{ width: '34px', height: '34px', borderRadius: theme.radius.sm, background: theme.colors.primary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        }
      >
        {contratoActivo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
              <span>Fecha inicio: {contratoActivo.fechaInicio}</span>
              <span>Fecha fin: {contratoActivo.fechaFin}</span>
            </div>
            <div style={{ background: theme.colors.bgApp, borderRadius: theme.radius.md, padding: '12px', fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
              {CONTRACT_TEXT}
            </div>
          </div>
        )}
      </Modal>

      {/* Descargar contrato */}
      <Modal isOpen={showDescargar} onClose={() => setShowDescargar(false)} title="Descargar Contrato">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '8px 0' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, textAlign: 'center' }}>
            Descarga existosa del contrato N°:{contratoActivo?.numero}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
              ContratoN{contratoActivo?.numero}.pdf
            </span>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
