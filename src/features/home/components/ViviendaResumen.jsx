import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import InfoButton from '../../../components/ui/InfoButton';
import { IncognitoBanner, ModuloBloqueado } from '../../../components/ui/ModuloEstado';
import { HELP } from '../../../config/helpContent';
import iconCorrespondencia from '../../../assets/icons/home/correspondencia.png';
import iconVisitas from '../../../assets/icons/home/Finales/visitas-final.png';
import iconZonasComunes from '../../../assets/icons/home/zonascomunes.png';
import iconAnuncios from '../../../assets/icons/home/anuncios.png';
import iconRanking from '../../../assets/icons/home/Finales/ranking-final.png';
import iconReglas from '../../../assets/icons/home/reglas.png';
import iconVivienda from '../../../assets/icons/home/vivienda.png';

// Panel de "Configuración" del Administrador — un componente desplegable
// in-place, no pantallas separadas. Sumar/quitar una sección del flujo de
// Administrador es solo editar este array.
const CONFIG_ADMIN_OPCIONES = [
  { key: 'zonas', label: 'ZONAS COMUNES', path: '/admin/gestion-zonas' },
  { key: 'arquitectura', label: 'ARQUITECTURA', path: '/admin/arquitectura' },
  { key: 'permisos', label: 'PERMISOS', path: '/admin/permisos' },
  { key: 'seguridad', label: 'SEGURIDAD', path: '/admin/seguridad' },
  { key: 'reclamos', label: 'CENTRO DE ATENCIÓN', path: '/perfil/soporte/reclamos' },
  { key: 'integracion', label: 'INTEGRACIÓN EXTERNA', path: '/integracion-externa' },
];

const modules = [
  { label: 'Correspondencia', icon: iconCorrespondencia, path: '/correspondencia', helpKey: 'correspondencia' },
  { label: 'Visitas',         icon: iconVisitas,         path: '/visitas',        helpKey: 'visitas' },
  { label: 'Zonas Comunes',   icon: iconZonasComunes,    path: '/zonas-comunes',  helpKey: 'zonas' },
  { label: 'Anuncios',        icon: iconAnuncios,        path: '/anuncios',       helpKey: 'anuncios' },
  { label: 'Ranking',         icon: iconRanking,         path: '/cuadro-honor',   helpKey: 'ranking' },
  { label: 'Reglas',          icon: iconReglas,          path: '/reglas',         helpKey: 'reglas' },
];

// Resumen de "Vivienda": tarjeta del edificio + grilla de módulos.
// Es el contenido principal de "/" para la mayoría de roles, y de "/vivienda"
// (tab "Viviendas") para el Inquilino Líder, que tiene un Home propio.
export default function ViviendaResumen() {
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [popupKey, setPopupKey] = useState(null);
  const { rolActivo, esIncognito, sinPropiedades, esResidente } = useApp();
  const esAdministrador = rolActivo === 'administrador';
  const esHuespedTemporal = rolActivo === 'huesped-temporal';
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
          <img src={iconVivienda} alt="Vivienda" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          Vivienda
        </h2>
        {rolActivo !== 'huesped-temporal' && (
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
        {(esHuespedTemporal ? modules.filter(m => m.label !== 'Ranking') : (noResidente ? modules.filter(m => !['Correspondencia', 'Visitas', 'Zonas Comunes'].includes(m.label)) : modules)).map(mod => {
          const help = HELP[mod.helpKey];
          const bloqueado = sinPropiedades;
          return (
            <div
              key={mod.label}
              onClick={() => {
                if (bloqueado || esIncognito) setPopupKey(mod.helpKey);
                else navigate(mod.label === 'Zonas Comunes' && esAdministrador ? '/admin/gestion-zonas' : mod.path);
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

              <img src={mod.icon} alt={mod.label} style={{ width: '88px', height: '88px', objectFit: 'contain' }} />
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
                {mod.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom spacing for FABs */}
      <div style={{ height: '80px' }} />
    </div>
  );
}
