import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import InputField from '../../components/ui/InputField';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { guardiasSeguridad as guardiasData } from '../../data/mockData';

const DIAS_SEMANA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
  padding: '16px',
};

const TOGGLES = [
  { key: 'modoDaltonico', label: 'Modo daltónico' },
  { key: 'fuenteAumentada', label: 'Fuente aumentada' },
  { key: 'modoOscuro', label: 'Modo Oscuro' },
];

const RAZONES_ELIMINAR = [
  'Ya no resido en este condominio',
  'Cambio de condominio',
  'No uso la aplicación',
  'Problemas con la app',
  'Otro',
];

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CampoBloqueado({ label, value, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: isLast ? 'none' : `1px solid ${theme.colors.borderLight}` }}>
      <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{label}: {value}</span>
      <LockIcon />
    </div>
  );
}

export default function ConfiguracionPage() {
  const { usuario, configuracionApp, actualizarConfiguracionApp, pausarCuenta, addToast, rolActivo, turnoTerminado, terminarTurno } = useApp();

  const nombre = usuario?.nombre || 'Guillermo';
  const apellido = usuario?.apellido || 'Coradir';
  const documento = '1632278423';
  const esGuardia = rolActivo === 'guardia';
  const guardiaActual = esGuardia ? guardiasData.find(g => g.nombre === (usuario?.nombre || 'Roberto Hornado')) : null;

  const [showPausar, setShowPausar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [pausaActiva, setPausaActiva] = useState(false);
  const [razonEliminar, setRazonEliminar] = useState(RAZONES_ELIMINAR[0]);
  const [otraRazon, setOtraRazon] = useState('');

  const usarAltNotif = configuracionApp.usarAltNotif;

  const confirmarPausar = () => {
    pausarCuenta();
    setPausaActiva(true);
    setShowPausar(false);
    addToast('Cuenta pausada. Ahora estás invisible y no recibirás notificaciones.', 'success');
  };

  const confirmarEliminar = () => {
    setShowEliminar(false);
    const razon = razonEliminar === 'Otro' ? (otraRazon.trim() || 'Otro') : razonEliminar;
    addToast(`Cuenta eliminada (demo). Razón: ${razon}`, 'success');
  };

  const handleTerminarTurno = () => {
    terminarTurno();
    addToast('Turno finalizado. Tus privilegios de seguridad se han deshabilitado.', 'success');
  };

  function obtenerTurnoActual(guardia) {
    if (!guardia?.turnos || guardia.turnos.length === 0) return null;
    const ahora = new Date();
    const diaActual = DIAS_SEMANA_ES[ahora.getDay()];
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    for (const t of guardia.turnos) {
      if (t.dia !== diaActual) continue;
      const partes = t.hora.split(' a ');
      if (partes.length !== 2) continue;
      const [hInicio, mInicio] = partes[0].split(':').map(Number);
      const [hFin, mFin] = partes[1].split(':').map(Number);
      const inicio = hInicio * 60 + mInicio;
      const fin = hFin * 60 + mFin;
      if (minutosActuales >= inicio && minutosActuales < fin) {
        const minutosRestantes = fin - minutosActuales;
        const horasRestantes = Math.floor(minutosRestantes / 60);
        const minsRestantes = minutosRestantes % 60;
        return { dia: t.dia, hora: t.hora, finMinutos: fin, ahoraMinutos: minutosActuales, restante: `${horasRestantes}h ${minsRestantes}min` };
      }
    }
    return null;
  }

  const turnoActual = guardiaActual ? obtenerTurnoActual(guardiaActual) : null;

  return (
    <AppShell>
      <PageHeader title="Configuración" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Turno actual — solo para guardia */}
        {esGuardia && guardiaActual && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '14px' }}>
              Turno Actual
            </h3>
            {turnoActual && !turnoTerminado ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estado</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: '#16A34A', fontWeight: theme.fonts.weights.semibold }}>En turno activo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Horario</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{turnoActual.hora}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Tiempo restante</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{turnoActual.restante}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Garita</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{guardiaActual.garita}</span>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <Button variant="danger" fullWidth onClick={handleTerminarTurno}>Terminar Turno</Button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estado</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, fontWeight: theme.fonts.weights.medium }}>
                    {turnoTerminado ? 'Turno finalizado' : 'Sin turno activo'}
                  </span>
                </div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, padding: '8px 0' }}>
                  Tus turnos configurados:
                </div>
                {guardiaActual.turnos.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? `1px solid ${theme.colors.borderLight}` : 'none' }}>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{t.dia}</span>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{t.hora}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Información Personal — solo lectura para guardia */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '4px' }}>
            Informacion Personal
          </h3>
          <CampoBloqueado label="Nombre" value={nombre} />
          <CampoBloqueado label="Apellido" value={apellido} />
          <CampoBloqueado label="Documento" value={documento} isLast />
        </div>

        {/* Información Contacto — solo lectura para guardia */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '14px' }}>
            Información Contacto
          </h3>
          {esGuardia ? (
            <>
              <CampoBloqueado label="Correo" value={usuario?.correo || configuracionApp.correo || ''} />
              <CampoBloqueado label="Teléfono" value={configuracionApp.telefono || ''} isLast />
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <InputField
                  label="Código del País"
                  value={configuracionApp.codigoPais}
                  onChange={v => actualizarConfiguracionApp({ codigoPais: v })}
                />
                <InputField
                  label="Numero de Telefono"
                  value={configuracionApp.telefono}
                  onChange={v => actualizarConfiguracionApp({ telefono: v })}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InputField
                  label="Correo electrónico"
                  value={usuario?.correo || configuracionApp.correo}
                  onChange={v => actualizarConfiguracionApp({ correo: v })}
                  type="email"
                />
                <InputField
                  label="Alias"
                  value={configuracionApp.alias}
                  onChange={v => actualizarConfiguracionApp({ alias: v })}
                />
              </div>

              <div style={{ marginTop: '14px', padding: '12px', background: theme.colors.primaryLight || '#EFF6FF', borderRadius: theme.radius.md, display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>📩</span>
                <p style={{ margin: 0, fontSize: theme.fonts.sizes.xs, color: theme.colors.text, lineHeight: 1.6 }}>
                  Las notificaciones de la aplicación se enviarán al número de teléfono y al correo registrados arriba. Si lo prefieres, puedes indicar datos alternativos para recibirlas.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>
                  ¿Recibir notificaciones en datos alternativos?
                </span>
                <Toggle value={usarAltNotif} onChange={v => actualizarConfiguracionApp({ usarAltNotif: v })} />
              </div>

              {usarAltNotif && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
                  <InputField
                    label="Número alternativo (notificaciones)"
                    value={configuracionApp.telefonoAlt}
                    onChange={v => actualizarConfiguracionApp({ telefonoAlt: v })}
                    placeholder="Opcional"
                  />
                  <InputField
                    label="Correo alternativo (notificaciones)"
                    value={configuracionApp.correoAlt}
                    onChange={v => actualizarConfiguracionApp({ correoAlt: v })}
                    type="email"
                    placeholder="Opcional"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Configuración de App — oculta para guardia */}
        {!esGuardia && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '4px' }}>
              Configuración de App
            </h3>
            {TOGGLES.map((t, i) => (
              <div
                key={t.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i === TOGGLES.length - 1 ? 'none' : `1px solid ${theme.colors.borderLight}`,
                }}
              >
                <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{t.label}</span>
                <Toggle value={configuracionApp[t.key]} onChange={v => actualizarConfiguracionApp({ [t.key]: v })} />
              </div>
            ))}
          </div>
        )}

        {/* Contacto Alternativo — solo para administrador */}
        {rolActivo === 'administrador' && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '14px' }}>
              Contacto Alternativo
            </h3>
            <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: '12px', lineHeight: 1.4 }}>
              Datos de contacto alternativos para recibir notificaciones.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InputField
                label="Correo alternativo"
                value={configuracionApp.correoAlt || ''}
                onChange={v => actualizarConfiguracionApp({ correoAlt: v })}
                placeholder="correo@ejemplo.com"
                type="email"
              />
              <InputField
                label="Teléfono alternativo"
                value={configuracionApp.telefonoAlt || ''}
                onChange={v => actualizarConfiguracionApp({ telefonoAlt: v })}
                placeholder="+593 999999999"
              />
            </div>
          </div>
        )}

        {/* Contacto de Emergencia — solo para administrador */}
        {rolActivo === 'administrador' && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '14px' }}>
              Contacto de Emergencia
            </h3>
            <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: '12px', lineHeight: 1.4 }}>
              Persona de contacto en caso de emergencia.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InputField
                label="Nombre del contacto"
                value={configuracionApp.emergenciaNombre || ''}
                onChange={v => actualizarConfiguracionApp({ emergenciaNombre: v })}
                placeholder="Nombre completo"
              />
              <InputField
                label="Correo de emergencia"
                value={configuracionApp.emergenciaCorreo || ''}
                onChange={v => actualizarConfiguracionApp({ emergenciaCorreo: v })}
                placeholder="correo@ejemplo.com"
                type="email"
              />
              <InputField
                label="Teléfono de emergencia"
                value={configuracionApp.emergenciaTelefono || ''}
                onChange={v => actualizarConfiguracionApp({ emergenciaTelefono: v })}
                placeholder="+593 999999999"
              />
            </div>
          </div>
        )}

        {/* Cuenta */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '14px' }}>
            Cuenta
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!esGuardia && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>
                  Pausar cuenta
                </span>
                <Toggle
                  value={pausaActiva}
                  onChange={(v) => {
                    if (v) setShowPausar(true);
                    else setPausaActiva(false);
                  }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowEliminar(true)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: theme.radius.full,
                background: theme.colors.dangerLight || '#FEE2E2',
                color: theme.colors.danger || '#DC2626',
                fontWeight: theme.fonts.weights.semibold,
                fontSize: theme.fonts.sizes.sm,
                border: 'none',
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
              }}
            >
              Eliminar cuenta
            </button>
          </div>
        </div>

        <div style={{ height: '8px' }} />
      </div>

      {/* Pausar cuenta — popup informativo */}
      <Modal isOpen={showPausar} onClose={() => setShowPausar(false)} title="Pausar cuenta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '48px' }}>⏸️</span>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.6, margin: 0 }}>
            Al pausar la cuenta te invisibilizas en todo lugar de la aplicación, pero tampoco recibirás notificaciones.
          </p>
          <Button variant="primary" fullWidth onClick={confirmarPausar}>Pausar cuenta</Button>
          <Button variant="ghost" fullWidth onClick={() => setShowPausar(false)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Eliminar cuenta — preguntar razón */}
      <Modal isOpen={showEliminar} onClose={() => setShowEliminar(false)} title="Eliminar cuenta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, textAlign: 'center', margin: 0 }}>
            ¿Es porque ya no resides en este condominio o cuál es la razón?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RAZONES_ELIMINAR.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRazonEliminar(r)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: theme.radius.md,
                  border: `1.5px solid ${razonEliminar === r ? theme.colors.primary : theme.colors.border}`,
                  background: razonEliminar === r ? (theme.colors.primaryLight || '#EFF6FF') : theme.colors.bgCard,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.sm,
                  fontWeight: theme.fonts.weights.medium,
                  color: theme.colors.text,
                }}
              >
                {r}
              </button>
            ))}
          </div>
          {razonEliminar === 'Otro' && (
            <InputField
              label="Cuéntanos la razón"
              value={otraRazon}
              onChange={setOtraRazon}
              placeholder="Escribe tu razón"
              multiline
              rows={2}
            />
          )}
          <Button variant="danger" fullWidth onClick={confirmarEliminar}>Eliminar cuenta</Button>
          <Button variant="ghost" fullWidth onClick={() => setShowEliminar(false)}>Cancelar</Button>
        </div>
      </Modal>

    </AppShell>
  );
}
