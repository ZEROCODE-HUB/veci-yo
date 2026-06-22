import { useState } from 'react';
import { Info, Lock, Lightbulb, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import theme from '../../config/theme';

/**
 * InfoButton — Sistema ÚNICO de ayuda contextual de la app.
 *
 * Patrón reutilizable: un icono de información consistente que abre un popup
 * informativo consistente. TODOS los mensajes explicativos de la plataforma
 * deben abrirse desde este componente — no se usan tooltips flotantes,
 * popups aislados ni patrones distintos por módulo.
 *
 * El contenido es contextual, educativo y orientado a la acción:
 *  - `titulo`       Qué es / nombre de la métrica o funcionalidad.
 *  - `descripcion`  Qué hace, en lenguaje claro.
 *  - `bullets`      Puntos educativos o métricas explicadas.
 *  - `ejemplo`      Ejemplo de uso (típico del modo incógnito).
 *  - `motivo`       Por qué está bloqueada (estado 'bloqueado').
 *  - `accion`       Qué debe hacer el usuario para habilitarla / siguiente paso.
 *  - `accionLabel` + `onAccion`  CTA opcional (ej. "Agregar propiedad").
 *
 * `variant`: 'info' (azul, informativo) | 'bloqueado' (gris/candado).
 */
export default function InfoButton({
  titulo,
  descripcion,
  bullets = [],
  ejemplo,
  motivo,
  accion,
  accionLabel,
  onAccion,
  variant = 'info',
  size = 18,
  ariaLabel = 'Más información',
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const isBloqueado = variant === 'bloqueado';
  const accent = isBloqueado ? theme.colors.textSecondary : theme.colors.secondary;
  const accentBg = isBloqueado ? theme.colors.bgMuted : theme.colors.secondaryLight;
  const HeaderIcon = isBloqueado ? Lock : Info;

  const handleAccion = () => {
    setOpen(false);
    onAccion?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        style={{
          width: `${size + 6}px`,
          height: `${size + 6}px`,
          borderRadius: '50%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          flexShrink: 0,
          lineHeight: 0,
          ...style,
        }}
      >
        <Info size={size} strokeWidth={2} />
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={titulo} showClose>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Encabezado con icono consistente */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: accentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accent,
            }}>
              <HeaderIcon size={28} strokeWidth={2} />
            </span>
          </div>

          {descripcion && (
            <p style={{
              fontSize: theme.fonts.sizes.base,
              color: theme.colors.text,
              lineHeight: theme.fonts.lineHeights.relaxed,
              textAlign: 'center',
              margin: 0,
            }}>
              {descripcion}
            </p>
          )}

          {bullets.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: accent, flexShrink: 0, marginTop: '2px', lineHeight: 0 }}>
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {ejemplo && (
            <div style={{
              background: theme.colors.primaryLight,
              borderRadius: theme.radius.lg,
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}>
              <span style={{ color: theme.colors.primaryDark, flexShrink: 0, marginTop: '1px', lineHeight: 0 }}>
                <Lightbulb size={18} strokeWidth={2} />
              </span>
              <div>
                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ejemplo
                </div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
                  {ejemplo}
                </div>
              </div>
            </div>
          )}

          {motivo && (
            <div style={{
              background: theme.colors.bgMuted,
              borderRadius: theme.radius.lg,
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}>
              <span style={{ color: theme.colors.textSecondary, flexShrink: 0, marginTop: '1px', lineHeight: 0 }}>
                <Lock size={16} strokeWidth={2} />
              </span>
              <div>
                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Por qué está bloqueada
                </div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
                  {motivo}
                </div>
              </div>
            </div>
          )}

          {accion && (
            <div style={{
              border: `1.5px solid ${theme.colors.primary}`,
              borderRadius: theme.radius.lg,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Qué hacer
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
                {accion}
              </div>
            </div>
          )}

          {accionLabel && onAccion ? (
            <Button variant="primary" fullWidth onClick={handleAccion}>{accionLabel}</Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Entendido</Button>
          )}
        </div>
      </Modal>
    </>
  );
}
