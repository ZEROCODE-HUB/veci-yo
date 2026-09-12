import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import InputField from '../../components/ui/InputField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
  padding: '16px',
};

const TOGGLES = [
  { key: 'faceId', label: 'Face ID' },
  { key: 'huellaDactilar', label: 'Huella Dactilar' },
  { key: 'f2a', label: 'Factor F2A' },
  { key: 'pausarCuenta', label: 'Pausar cuenta' },
];

const RAZONES_ELIMINAR = [
  'Ya no resido en este condominio',
  'Cambio de condominio',
  'No uso la aplicación',
  'Problemas con la app',
  'Otro',
];

export default function SeguridadPage() {
  const { seguridad, actualizarSeguridad, pausarCuenta, addToast } = useApp();
  const [showCambiarPass, setShowCambiarPass] = useState(false);
  const [showPausar, setShowPausar] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [razonEliminar, setRazonEliminar] = useState(RAZONES_ELIMINAR[0]);
  const [otraRazon, setOtraRazon] = useState('');

  const confirmarPausar = () => {
    pausarCuenta();
    setShowPausar(false);
    addToast('Cuenta pausada. Ahora estás invisible y no recibirás notificaciones.', 'success');
  };

  const confirmarEliminar = () => {
    const razon = razonEliminar === 'Otro' ? (otraRazon.trim() || 'Otro') : razonEliminar;
    setShowEliminar(false);
    addToast(`Cuenta eliminada (demo). Razón: ${razon}`, 'success');
  };

  return (
    <AppShell>
      <PageHeader title="Seguridad" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Información Contacto */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '14px' }}>
            Información Contacto
          </h3>
          <InputField
            label="Correo de respaldo"
            value={seguridad.correoRespaldo}
            onChange={v => actualizarSeguridad({ correoRespaldo: v })}
          />
        </div>

        {/* Usabilidad */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginBottom: '4px' }}>
            Usabilidad
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
              <Toggle
                value={seguridad[t.key]}
                onChange={v => {
                  if (t.key === 'pausarCuenta') {
                    if (v) setShowPausar(true);
                    else actualizarSeguridad({ pausarCuenta: false });
                  } else {
                    actualizarSeguridad({ [t.key]: v });
                  }
                }}
              />
            </div>
          ))}
        </div>

        <Button variant="primary" fullWidth onClick={() => setShowCambiarPass(true)}>
          Cambiar Contraseña
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setShowEliminar(true)}>
          Eliminar Cuenta
        </Button>
      </div>

      {/* Cambiar Contraseña */}
      <Modal isOpen={showCambiarPass} onClose={() => setShowCambiarPass(false)} title="Cambiar contraseña">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <h3 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
            Revisa su correo!
          </h3>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Se envió el enlace de restablecimiento de contraseña a su correo tiene vigencia 15 minutos y vence!
          </p>
          <Button variant="primary" fullWidth onClick={() => setShowCambiarPass(false)}>Aceptar</Button>
        </div>
      </Modal>

      {/* Pausar cuenta — popup informativo al activar el toggle */}
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

      {/* Eliminar Cuenta */}
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
