import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { tiposDocumentoPorPais } from '../../data/mockData';
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
(tiposDocumentoPorPais?.default || []).forEach(t => {
  if (!DOC_CONFIG[t]) {
    DOC_CONFIG[t] = { frente: `Foto frontal del ${t}` };
  }
});
const DOC_CONFIG_FALLBACK = { frente: 'Foto frontal del documento' };
const DOC_CONFIG_DEFAULT = DOC_CONFIG['Cédula'];

const TERMINOS_INICIALES = {
  datos: { checked: false, label: 'Acepto términos y condiciones y autorizo el tratamiento de mis datos personales.' },
  convivencia: { checked: false, label: 'Acepto términos y condiciones del manual de convivencia.' },
  responsabilidad: { checked: false, label: 'Acepto términos y condiciones de descarga de responsabilidad civil.' },
};

function ComunidadBadge({ selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: '8px',
        background: '#fff',
        borderRadius: theme.radius.full,
        padding: '8px 14px 8px 8px',
        boxShadow: theme.shadows.card,
        border: 'none',
        cursor: 'pointer',
        fontFamily: theme.fonts.family,
      }}
    >
      <span style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: selected ? theme.colors.text : 'transparent',
        border: selected ? 'none' : `1.5px solid ${theme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: `background ${theme.transitions.fast}, border-color ${theme.transitions.fast}`,
      }}>
        {selected && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.sm, color: selected ? theme.colors.text : theme.colors.textSecondary }}>
        Comunidad Andina*
      </span>
    </button>
  );
}

// Ilustraciones de muestra para el popup de ayuda — no existen imágenes
// fuente para estas referencias, así que se arman con las mismas formas y
// colores del design system (mismo lenguaje visual que ImageUploadCard).
function MuestraIlustracion({ tipo }) {
  const marco = {
    width: '100%',
    height: '150px',
    borderRadius: theme.radius.lg,
    border: `1.5px solid ${theme.colors.border}`,
    background: theme.colors.bgMuted,
    overflow: 'hidden',
    display: 'flex',
  };

  if (tipo === 'pasaporte') {
    return (
      <div style={{ ...marco, alignItems: 'center', gap: '16px', padding: '18px' }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.textMuted, letterSpacing: '0.12em' }}>
            PASAPORTE
          </div>
          <div style={{ width: '46px', height: '58px', borderRadius: theme.radius.sm, background: theme.colors.border, margin: '8px auto 0' }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <div style={{ width: '85%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.primary }} />
          <div style={{ width: '65%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.border }} />
          <div style={{ width: '75%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.border }} />
          <div style={{ width: '50%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.border }} />
        </div>
      </div>
    );
  }

  if (tipo === 'dorso') {
    return (
      <div style={{ ...marco, flexDirection: 'column', justifyContent: 'center', gap: '12px', padding: '18px' }}>
        <div style={{ width: '70%', height: '8px', borderRadius: theme.radius.full, background: theme.colors.border }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} style={{ width: '3px', height: `${12 + (i % 4) * 6}px`, background: theme.colors.text, opacity: i % 7 === 0 ? 0.3 : 1 }} />
          ))}
        </div>
        <div style={{ alignSelf: 'flex-end', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.danger, letterSpacing: '0.06em' }}>
          00:00:00
        </div>
      </div>
    );
  }

  // 'frente' — documento con foto + líneas de datos (cédula, DNI o licencia)
  return (
    <div style={{ ...marco, alignItems: 'center', gap: '16px', padding: '18px' }}>
      <div style={{ width: '54px', height: '64px', borderRadius: theme.radius.sm, background: theme.colors.border, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ width: '75%', height: '7px', borderRadius: theme.radius.full, background: theme.colors.primary }} />
        <div style={{ width: '90%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.border }} />
        <div style={{ width: '60%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.border }} />
        <div style={{ width: '80%', height: '6px', borderRadius: theme.radius.full, background: theme.colors.border }} />
      </div>
    </div>
  );
}

// Popup de ayuda mostrado antes de abrir la cámara — reutiliza Modal (mismo
// header "título + X" que las referencias de muestra) en vez de crear un
// componente de overlay nuevo.
function MuestraPopup({ isOpen, onClose, tipo, onAbrirCamara }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verificación de identidad">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.snug }}>
          Enfoque su documento igual que en la imagen de muestra
        </p>
        <MuestraIlustracion tipo={tipo} />
        <Button variant="primary" fullWidth onClick={onAbrirCamara}>Abrir cámara</Button>
      </div>
    </Modal>
  );
}

export default function VerificacionPage() {
  const navigate = useNavigate();
  const { usuario, completarVerificacion } = useApp();

  const docConfig = DOC_CONFIG[usuario?.tipoDocumento] || DOC_CONFIG['Cédula'] || DOC_CONFIG_FALLBACK;
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
  const [comunidadAndina, setComunidadAndina] = useState(true);

  // Popup de muestra antes de la cámara: se intercepta el primer toque sobre
  // la tarjeta de frente/dorso y, al aceptar, se dispara el selector nativo
  // mediante el método imperativo expuesto por ImageUploadCard.
  const refFrente = useRef(null);
  const refDorso = useRef(null);
  const [muestraStep, setMuestraStep] = useState(null);
  const tipoMuestra = muestraStep === 'dorso' ? 'dorso' : (tieneDorso ? 'frente' : 'pasaporte');

  const cerrarMuestra = () => setMuestraStep(null);
  const handleAbrirCamaraDesdeMuestra = () => {
    const ref = muestraStep === 'dorso' ? refDorso : refFrente;
    setMuestraStep(null);
    ref.current?.abrir();
  };

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

        <ComunidadBadge selected={comunidadAndina} onToggle={() => setComunidadAndina(v => !v)} />

        {stepId === 'frente' && (
          <ImageUploadCard
            ref={refFrente}
            label={docConfig.frente}
            placeholder="Tomar o subir foto"
            helperText="Asegúrate de que el documento se vea completo, legible y sin reflejos."
            value={fotoFrente}
            onChange={setFotoFrente}
            onBeforeOpen={() => setMuestraStep('frente')}
            capture="environment"
            height="190px"
          />
        )}

        {stepId === 'dorso' && (
          <ImageUploadCard
            ref={refDorso}
            label={docConfig.dorso}
            placeholder="Tomar o subir foto"
            helperText="Asegúrate de que el documento se vea completo, legible y sin reflejos."
            value={fotoDorso}
            onChange={setFotoDorso}
            onBeforeOpen={() => setMuestraStep('dorso')}
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

      <MuestraPopup
        isOpen={!!muestraStep}
        onClose={cerrarMuestra}
        tipo={tipoMuestra}
        onAbrirCamara={handleAbrirCamaraDesdeMuestra}
      />

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
