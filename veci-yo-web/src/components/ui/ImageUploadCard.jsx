import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import theme from '../../config/theme';

const MAX_SIZE_MB = 8;

function CameraIcon({ color }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/**
 * Reusable real-device image picker: opens the native file selector,
 * shows a live preview from the chosen file, and allows replacing it.
 * `capture` accepts 'user' | 'environment' to hint front/rear camera on mobile.
 */
const ImageUploadCard = forwardRef(function ImageUploadCard({
  label,
  helperText,
  value,
  onChange,
  placeholder = 'Subir imagen',
  circular = false,
  height = '160px',
  capture,
  error = '',
  onBeforeOpen,
}, ref) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!value) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const openPicker = () => inputRef.current?.click();

  // Permite a la pantalla contenedora interceptar el primer toque (p. ej. para
  // mostrar un popup de ayuda con una imagen de muestra) y disparar la cámara
  // ella misma cuando corresponda, sin duplicar la lógica del selector nativo.
  useImperativeHandle(ref, () => ({ abrir: openPicker }));

  const handlePress = () => {
    if (onBeforeOpen) onBeforeOpen();
    else openPicker();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('Selecciona un archivo de imagen válido (JPG, PNG).');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`La imagen no debe superar los ${MAX_SIZE_MB}MB.`);
      return;
    }
    setLocalError('');
    onChange(file);
  };

  const shownError = error || localError;
  const borderColor = shownError ? theme.colors.danger : theme.colors.border;

  return (
    <div>
      {label && (
        <div style={{
          fontSize: theme.fonts.sizes.sm,
          color: theme.colors.textSecondary,
          fontWeight: theme.fonts.weights.medium,
          marginBottom: '8px',
        }}>
          {label}
        </div>
      )}

      <button
        type="button"
        onClick={handlePress}
        style={{
          width: circular ? height : '100%',
          height,
          margin: circular ? '0 auto' : 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: previewUrl ? 'transparent' : theme.colors.bgMuted,
          border: `1.5px ${previewUrl ? 'solid' : 'dashed'} ${borderColor}`,
          borderRadius: circular ? theme.radius.full : theme.radius.xl,
          overflow: 'hidden',
          cursor: 'pointer',
          padding: 0,
          fontFamily: theme.fonts.family,
          transition: `border-color ${theme.transitions.fast}`,
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label || placeholder}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <>
            <CameraIcon color={theme.colors.textMuted} />
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
              {placeholder}
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', justifyContent: circular ? 'center' : 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px' }}>
        {helperText && !shownError && (
          <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>{helperText}</span>
        )}
        {shownError && (
          <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, fontWeight: theme.fonts.weights.medium }}>{shownError}</span>
        )}
        {previewUrl && (
          <button
            type="button"
            onClick={openPicker}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: theme.fonts.sizes.xs,
              fontWeight: theme.fonts.weights.semibold,
              color: theme.colors.secondary,
              fontFamily: theme.fonts.family,
              flexShrink: 0,
            }}
          >
            Reemplazar imagen
          </button>
        )}
      </div>
    </div>
  );
});

export default ImageUploadCard;
