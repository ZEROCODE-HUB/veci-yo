import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Checkbox from '../../components/ui/Checkbox';
import ImageUploadCard from '../../components/ui/ImageUploadCard';

// Cada tipo de documento define qué fotos se piden. El pasaporte solo
// requiere una cara; cédula y DNI requieren frente y dorso. Agregar un
// nuevo tipo de documento es solo sumar una entrada aquí.
const DOC_CONFIG = {
  'Cédula': { frente: 'Foto frontal de la cédula', dorso: 'Foto trasera de la cédula' },
  'DNI': { frente: 'Foto frontal del DNI', dorso: 'Foto trasera del DNI' },
  'Pasaporte': { frente: 'Foto frontal de su pasaporte' },
};
const DOC_CONFIG_DEFAULT = DOC_CONFIG['Cédula'];

const TERMINOS_INICIALES = {
  datos: { checked: false, label: 'Acepto términos y condiciones y autorizo el tratamiento de mis datos personales.' },
  convivencia: { checked: false, label: 'Acepto términos y condiciones del manual de convivencia.' },
  responsabilidad: { checked: false, label: 'Acepto términos y condiciones de descarga de responsabilidad civil.' },
};

function ComunidadBadge() {
  return (
    <div style={{
      display: 'inline-flex',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: '8px',
      background: '#fff',
      borderRadius: theme.radius.full,
      padding: '8px 14px 8px 8px',
      boxShadow: theme.shadows.card,
    }}>
      <span style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: theme.colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
        Comunidad Andina*
      </span>
    </div>
  );
}

export default function VerificacionPage() {
  const navigate = useNavigate();
  const { usuario, completarVerificacion } = useApp();

  const docConfig = DOC_CONFIG[usuario?.tipoDocumento] || DOC_CONFIG_DEFAULT;
  const tieneDorso = !!docConfig.dorso;
  const stepIds = useMemo(() => (tieneDorso ? ['frente', 'dorso', 'rostro'] : ['frente', 'rostro']), [tieneDorso]);

  const [stepIndex, setStepIndex] = useState(0);
  const stepId = stepIds[stepIndex];
  const isLastStep = stepIndex === stepIds.length - 1;

  const [fotoFrente, setFotoFrente] = useState(null);
  const [fotoDorso, setFotoDorso] = useState(null);
  const [fotoRostro, setFotoRostro] = useState(null);
  const [terminos, setTerminos] = useState(TERMINOS_INICIALES);
  const [showExito, setShowExito] = useState(false);

  const toggleTermino = (key) => (checked) => {
    setTerminos(prev => ({ ...prev, [key]: { ...prev[key], checked } }));
  };

  const puedeAvanzar = () => {
    if (stepId === 'frente') return !!fotoFrente;
    if (stepId === 'dorso') return !!fotoDorso;
    if (stepId === 'rostro') return !!fotoRostro && Object.values(terminos).every(t => t.checked);
    return false;
  };

  const handleVolver = () => {
    if (stepIndex === 0) navigate(-1);
    else setStepIndex(i => i - 1);
  };

  const handleSiguiente = () => {
    if (!puedeAvanzar()) return;
    if (!isLastStep) {
      setStepIndex(i => i + 1);
    } else {
      completarVerificacion();
      setShowExito(true);
    }
  };

  const handleAceptarExito = () => {
    setShowExito(false);
    navigate('/', { replace: true });
  };

  return (
    <AppShell>
      <PageHeader title="Verificación de identidad" onBack={handleVolver} />

      <div style={{ padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: theme.fonts.family }}>
        {/* Progreso */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {stepIds.map((id, i) => (
            <div
              key={id}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: theme.radius.full,
                background: i <= stepIndex ? theme.colors.primary : theme.colors.border,
                transition: `background ${theme.transitions.base}`,
              }}
            />
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
          Ingrese la información solicitada para su registro. Usaremos su cámara para verificar sus datos biométricos.
        </p>

        <ComunidadBadge />

        {stepId === 'frente' && (
          <ImageUploadCard
            label={docConfig.frente}
            placeholder="Tomar o subir foto"
            helperText="Asegúrate de que el documento se vea completo, legible y sin reflejos."
            value={fotoFrente}
            onChange={setFotoFrente}
            capture="environment"
            height="190px"
          />
        )}

        {stepId === 'dorso' && (
          <ImageUploadCard
            label={docConfig.dorso}
            placeholder="Tomar o subir foto"
            helperText="Asegúrate de que el documento se vea completo, legible y sin reflejos."
            value={fotoDorso}
            onChange={setFotoDorso}
            capture="environment"
            height="190px"
          />
        )}

        {stepId === 'rostro' && (
          <>
            <ImageUploadCard
              label="Foto del rostro"
              placeholder="Tomar selfie"
              helperText="Mira de frente a la cámara, en un lugar bien iluminado."
              value={fotoRostro}
              onChange={setFotoRostro}
              capture="user"
              circular
              height="170px"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(terminos).map(([key, t]) => (
                <Checkbox key={key} checked={t.checked} onChange={toggleTermino(key)} label={t.label} />
              ))}
            </div>
          </>
        )}

        <Button variant="primary" fullWidth disabled={!puedeAvanzar()} onClick={handleSiguiente}>
          {isLastStep ? 'Finalizar' : 'Siguiente'}
        </Button>
      </div>

      <Modal isOpen={showExito} onClose={handleAceptarExito} showClose={false}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '44px' }}>✅</span>
          <h2 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.snug }}>
            ¡Validación de vida exitosa! Revisa el estado en tus notificaciones.
          </h2>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Si alguna parte de la verificación no se valida correctamente, solo tendrás que rehacer esa parte — no todo el proceso.
          </p>
          <Button variant="primary" fullWidth onClick={handleAceptarExito}>Aceptar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
