import { useNavigate } from 'react-router-dom';
import { Eye, Lock } from 'lucide-react';
import theme from '../../config/theme';
import InfoButton from './InfoButton';
import Button from './Button';
import { useApp } from '../../context/AppContext';
import { HELP, INCOGNITO_BANNER } from '../../config/helpContent';

/**
 * Componentes reutilizables para diferenciar de forma consistente los estados
 * de usuario en cada módulo. Se usan junto al hook `useEstadoUsuario`.
 *
 *  - IncognitoBanner: aviso de "datos de ejemplo" para el modo incógnito.
 *    Mantiene el acceso visual a los módulos y apoya la exploración.
 *  - ModuloBloqueado: estado deshabilitado para usuarios SIN propiedades.
 *    Explica qué hace la función, por qué está bloqueada y qué hacer, con el
 *    mismo InfoButton del sistema de ayuda. NO usa los empty states del modo
 *    incógnito.
 */

export function IncognitoBanner({ help }) {
  return (
    <div style={{
      background: theme.colors.secondaryLight,
      border: `1px solid ${theme.colors.secondary}33`,
      borderRadius: theme.radius.lg,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ color: theme.colors.secondary, flexShrink: 0, lineHeight: 0 }}>
        <Eye size={20} strokeWidth={2} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          {INCOGNITO_BANNER.titulo}
        </div>
        <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.snug }}>
          {INCOGNITO_BANNER.descripcion}
        </div>
      </div>
      {help && (
        <InfoButton variant="info" titulo={help.titulo} descripcion={help.descripcion} bullets={help.bullets} ejemplo={help.ejemplo} />
      )}
    </div>
  );
}

export function ModuloBloqueado({ help, onAgregar }) {
  const navigate = useNavigate();
  const irAAgregar = onAgregar || (() => navigate('/administracion-ubicacion'));

  return (
    <div style={{
      background: theme.colors.bgCard,
      borderRadius: theme.radius.xl,
      boxShadow: theme.shadows.card,
      padding: '28px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '14px',
      textAlign: 'center',
    }}>
      <span style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: theme.colors.bgMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.colors.textSecondary,
      }}>
        <Lock size={30} strokeWidth={2} />
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <h3 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
          {help.titulo}
        </h3>
        <InfoButton
          variant="bloqueado"
          titulo={help.titulo}
          descripcion={help.descripcion}
          motivo={help.motivo}
          accion={help.accion}
          accionLabel="Agregar propiedad"
          onAccion={irAAgregar}
        />
      </div>
      <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
        {help.descripcion} Esta función se habilita al registrar una propiedad.
      </p>
      <Button variant="primary" fullWidth onClick={irAAgregar}>Agregar propiedad</Button>
    </div>
  );
}

/**
 * ModuloHeaderInfo — icono de información para el encabezado de un módulo.
 * Reutilizable en `PageHeader.action`. Mantiene a la derecha cualquier acción
 * existente (ej. botón "+") salvo cuando el usuario no tiene propiedades, donde
 * la acción se oculta porque la función está bloqueada.
 */
export function ModuloHeaderInfo({ helpKey, action }) {
  const { sinPropiedades } = useApp();
  const help = HELP[helpKey];
  if (!help) return action || null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <InfoButton
        variant="info"
        titulo={help.info.titulo}
        descripcion={help.info.descripcion}
        bullets={help.info.bullets}
        ejemplo={help.info.ejemplo}
      />
      {!sinPropiedades && action}
    </div>
  );
}

/**
 * ModuloGate — envuelve el contenido de un módulo y aplica el estado de usuario:
 *  - sinPropiedades: reemplaza el contenido por la tarjeta de bloqueo.
 *  - esIncognito:    antepone el banner de "datos de ejemplo".
 *  - con propiedades: muestra el contenido tal cual.
 */
export function ModuloGate({ helpKey, children }) {
  const { esIncognito, sinPropiedades } = useApp();
  const help = HELP[helpKey];

  if (sinPropiedades) {
    return (
      <div style={{ padding: '16px' }}>
        <ModuloBloqueado help={help.bloqueo} />
      </div>
    );
  }

  return (
    <>
      {esIncognito && (
        <div style={{ padding: '12px 16px 0' }}>
          <IncognitoBanner help={help.info} />
        </div>
      )}
      {children}
    </>
  );
}
