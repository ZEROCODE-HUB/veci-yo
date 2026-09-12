import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import InfoButton from '../../../components/ui/InfoButton';
import { IncognitoBanner, ModuloBloqueado } from '../../../components/ui/ModuloEstado';
import { HELP } from '../../../config/helpContent';
import iconCorrespondencia from '../../../assets/icons/home/correspondencia.png';
import iconVisitas from '../../../assets/icons/home/Finales/visitas-final-final.png';
import iconZonasComunes from '../../../assets/icons/home/zonascomunes.png';
import iconAnuncios from '../../../assets/icons/home/anuncios.png';
import iconRanking from '../../../assets/icons/home/Finales/ranking-final-final.png';
import iconReglas from '../../../assets/icons/home/reglas.png';
import iconVivienda from '../../../assets/icons/home/vivienda.png';
import iconMiAlojamiento from '../../../assets/icons/home/Finales/mi-alojamiento.jfif';

// Panel de "Configuración" del Administrador — un componente desplegable
// in-place, no pantallas separadas. Sumar/quitar una sección del flujo de
// Administrador es solo editar este array.
const CONFIG_ADMIN_OPCIONES = [
  { key: 'arquitectura', label: 'ARQUITECTURA', path: '/admin/arquitectura' },
  { key: 'permisos', label: 'PERMISOS', path: '/admin/permisos' },
  { key: 'seguridad', label: 'SEGURIDAD', path: '/admin/seguridad' },
  { key: 'coadministradores', label: 'COADMINISTRADORES', path: '/admin/coadministradores' },
  { key: 'reportes', label: 'REPORTES', path: '/admin/reportes' },
  { key: 'reclamos', label: 'CENTRO DE ATENCIÓN', path: '/perfil/soporte/reclamos' },
];

const modules = [
  { id: 'correspondencia', label: 'Correspondencia',            icon: iconCorrespondencia, path: '/correspondencia', helpKey: 'correspondencia' },
  { id: 'visitas',         label: 'Visitas',                   icon: iconVisitas,         path: '/visitas',        helpKey: 'visitas' },
  { id: 'zonas-comunes',   label: 'Zonas Comunes',             icon: iconZonasComunes,    path: '/zonas-comunes',  helpKey: 'zonas' },
  { id: 'anuncios',        label: 'Anuncios y encuestas',      icon: iconAnuncios,        path: '/anuncios',       helpKey: 'anuncios' },
  { id: 'ranking',         label: 'Cuadro de Honor',           icon: iconRanking,         path: '/cuadro-honor',   helpKey: 'ranking' },
  { id: 'reglas',          label: 'Reglamentos y renta corta', icon: iconReglas,          path: '/reglas',         helpKey: 'reglas' },
];

const guestbookModule = { id: 'mi-alojamiento', label: 'Mi alojamiento', icon: iconMiAlojamiento, path: '/vivienda/mi-alojamiento', helpKey: 'mi-alojamiento' };

// Resumen de "Vivienda": tarjeta del edificio + grilla de módulos.
// Es el contenido principal de "/" para la mayoría de roles, y de "/vivienda"
// (tab "Viviendas") para el Inquilino Líder, que tiene un Home propio.
export default function ViviendaResumen() {
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [popupKey, setPopupKey] = useState(null);
  const { rolActivo, esIncognito, sinPropiedades, esResidente, ubicacionActiva, configHuespedesTemporales } = useApp();
  const guestbook = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id]?.guestbook : null;
  const esAdministrador = rolActivo === 'administrador';
  const esHuespedTemporal = rolActivo === 'huesped-temporal';
  const esGuardia = rolActivo === 'guardia';
  const noResidente = rolActivo === 'propietario' && !esResidente;

  const handleConfiguracion = () => {
    if (esAdministrador) setConfigOpen(o => !o);
    else if (rolActivo === 'propietario') navigate('/propietario/configuracion');
    else if (rolActivo === 'inquilino-lider') navigate('/inquilino-lider/configuracion');
    else navigate('/configuracion');
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Building card */}
      <div
        style={{
          background: theme.colors.bgCard,
          borderRadius: theme.radius.xl,
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          boxShadow: theme.shadows.card,
        }}
      >
        <div
          style={{
            width: '112px',
            height: '112px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${theme.colors.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#E8E4DC',
          }}
        >
          <img src={ubicacionActiva?.imagen || iconVivienda} alt="Vivienda" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          {ubicacionActiva?.alias || 'Vivienda'}
        </h2>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: theme.radius.full,
            background: '#F8FAFC',
            border: `1px solid ${theme.colors.border}`,
            fontSize: theme.fonts.sizes.xs,
            fontWeight: theme.fonts.weights.semibold,
            color: theme.colors.textSecondary,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <span style={{ fontSize: '12px', lineHeight: 1 }}>🏠</span> Vivienda
        </span>
        {rolActivo !== 'huesped-temporal' && !esGuardia && (
          <button
            onClick={handleConfiguracion}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: esAdministrador && configOpen ? `${theme.radius.full} ${theme.radius.full} 0 0` : theme.radius.full,
              background: theme.colors.primary,
              color: theme.colors.text,
              fontWeight: theme.fonts.weights.semibold,
              fontSize: theme.fonts.sizes.sm,
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              position: 'relative',
            }}
          >
            Configuración
            {esAdministrador && (
              <span style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: `translateY(-50%) rotate(${configOpen ? 180 : 0}deg)`,
                transition: 'transform 200ms',
                fontSize: '12px',
              }}>
                ↓
              </span>
            )}
          </button>
        )}

        {/* Panel desplegable del Administrador — componente in-place, no rutas nuevas para abrirlo */}
        {esAdministrador && configOpen && (
          <div style={{ width: '100%', marginTop: '-12px', display: 'flex', flexDirection: 'column', animation: 'slideDown 200ms ease' }}>
            {CONFIG_ADMIN_OPCIONES.map((op, i) => (
              <button
                key={op.key}
                onClick={() => { setConfigOpen(false); navigate(op.path); }}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: theme.colors.primary,
                  color: theme.colors.text,
                  fontWeight: theme.fonts.weights.bold,
                  fontSize: theme.fonts.sizes.sm,
                  letterSpacing: '0.04em',
                  border: 'none',
                  borderTop: '1px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  borderRadius: i === CONFIG_ADMIN_OPCIONES.length - 1 ? `0 0 ${theme.radius.full} ${theme.radius.full}` : 0,
                }}
              >
                {op.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modo incógnito: aviso de datos de ejemplo, manteniendo el acceso
          visual a los módulos para explorar. */}
      {esIncognito && <IncognitoBanner help={HELP.propiedades.info} />}

      {/* Usuario sin propiedades: NO se usan los empty states de incógnito; se
          invita a registrar la primera propiedad para habilitar los módulos. */}
      {sinPropiedades && (
        <ModuloBloqueado help={HELP.propiedades.bloqueo} onAgregar={() => navigate('/administracion-ubicacion')} />
      )}

      {/* Module grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        {(() => {
          const visibleModules = esHuespedTemporal
            ? [...modules.filter(m => m.id !== 'ranking'), guestbookModule]
            : (noResidente ? modules.filter(m => !['correspondencia', 'visitas', 'zonas-comunes'].includes(m.id)) : modules);
          return visibleModules;
        })().map(mod => {
          const help = HELP[mod.helpKey];
          const bloqueado = sinPropiedades;
          return (
            <div
              key={mod.id}
              onClick={() => {
                if (bloqueado || esIncognito) setPopupKey(mod.helpKey);
                else navigate(mod.id === 'zonas-comunes' && esAdministrador ? '/admin/gestion-zonas' : mod.path);
              }}
              role={'button'}
              style={{
                position: 'relative',
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '14px',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: theme.shadows.card,
                border: 'none',
                cursor: bloqueado ? 'default' : 'pointer',
                fontFamily: theme.fonts.family,
                opacity: bloqueado ? 0.55 : 1,
                filter: bloqueado ? 'grayscale(0.4)' : 'none',
              }}
            >
              {/* Icono de información: en módulos bloqueados explica qué hace,
                  por qué está bloqueado y cómo habilitarlo; en incógnito
                  explica las métricas con ejemplos. */}
              {help && (bloqueado || esIncognito) && (
                <div style={{ position: 'absolute', top: '8px', right: '8px' }} onClick={e => e.stopPropagation()}>
                  <InfoButton
                    variant={bloqueado ? 'bloqueado' : 'info'}
                    titulo={bloqueado ? help.bloqueo.titulo : help.info.titulo}
                    descripcion={bloqueado ? help.bloqueo.descripcion : help.info.descripcion}
                    bullets={bloqueado ? [] : (help.info.bullets || [])}
                    motivo={bloqueado ? help.bloqueo.motivo : undefined}
                    accion={bloqueado ? help.bloqueo.accion : undefined}
                    accionLabel={bloqueado ? 'Agregar propiedad' : undefined}
                    onAccion={bloqueado ? () => navigate('/administracion-ubicacion') : undefined}
                    isOpen={popupKey === mod.helpKey}
                    onOpenChange={(open) => { if (open) setPopupKey(mod.helpKey); else setPopupKey(null); }}
                  />
                </div>
              )}

              <div style={{ width: '100%', height: '120px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={mod.icon} alt={mod.label} style={{ width: mod.id === 'ranking' || mod.id === 'visitas' ? '120px' : '88px', height: mod.id === 'ranking' || mod.id === 'visitas' ? '120px' : '88px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium, minHeight: '2.4em', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.2 }}>
                {mod.label}
              </span>
            </div>
          );
        })}
      </div>

      {!esHuespedTemporal && guestbook && (guestbook.wifiName || guestbook.instructions) && (
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding:'16px', boxShadow: theme.shadows.card, display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>Guestbook — Mi alojamiento</div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{ubicacionActiva?.alias} · {ubicacionActiva?.direccion}</div>
          {guestbook.wifiName && <div style={{ fontSize: theme.fonts.sizes.sm }}>Wi-Fi: <strong>{guestbook.wifiName}</strong> {guestbook.wifiPassword && `· Contraseña: ${guestbook.wifiPassword}`}</div>}
          {guestbook.doorPassword && <div style={{ fontSize: theme.fonts.sizes.sm }}>Contraseña puerta: <strong>{guestbook.doorPassword}</strong></div>}
          {guestbook.instructions && <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Instrucciones: {guestbook.instructions}</div>}
          {guestbook.notes && <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Notas: {guestbook.notes}</div>}
        </div>
      )}
      {/* Bottom spacing for FABs */}
      <div style={{ height: '80px' }} />
    </div>
  );
}
